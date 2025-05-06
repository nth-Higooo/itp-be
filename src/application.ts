import express, {
  Application as ExApplication,
  Handler,
  NextFunction,
  Request,
  Response,
} from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "./middlewares/morgan";
import { appRouters } from "./routers";
import {
  BadRequestError,
  ForbiddenError,
  GoneError,
  InternalServerError,
  MethodNotAllowedError,
  NotAcceptableError,
  NotFoundError,
  UnauthorizedError,
} from "./utils/errors";
import { IRouter } from "./decorators/handlers";
import { MetadataKeys } from "./utils/enums";
import { Session } from "./database/entities/Session";
import { TokenExpiredError, verify } from "jsonwebtoken";
import config from "./configuration";
import { getRolesAndPermissionsByUser } from "./database/repositories/auth.repository";
import { IAuthorize, IUserPermission } from "./utils/interfaces";
import { initFolder } from "./utils/file";
import { initCronModule } from "./cron";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "hrms-backend API",
      version: "1.0.0",
      description: "API Documentation",
    },
    servers: [
      {
        url: "http://localhost:4000", // Replace with your server URL
      },
    ],
  },
  apis: ["./src/controllers/*.ts"], // Path to your route files
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

class Application {
  private readonly _instance: ExApplication;

  get instance(): ExApplication {
    return this._instance;
  }

  constructor() {
    initFolder();
    this._instance = express();
    this._instance.use(morgan);
    this._instance.use(express.json());
    this._instance.use(express.urlencoded({ extended: false }));
    this._instance.use(
      cors({
        origin: config.clientSite,
        credentials: true,
      })
    );
    this._instance.use(cookieParser());
    this._instance.use(
      "/api-docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec)
    );
    this.middleware();
    this.registerRouters();
    this.handleErrors();
    // this._instance.use(
    //   "/static/image",
    //   express.static(config.upload_image_dir)
    // );
    // this._instance.use("/static/pdfs", express.static(config.upload_pdf_dir));
    // initCronModule();

    this._instance.use("/", (req: Request, res: Response) => {
      res.send("Hello World! Your server is running.");
    });
  }

  private middleware(): void {
    this._instance.use(
      async (req: Request, res: Response, next: NextFunction) => {
        res.locals.session = null;
        try {
          const { authorization } = req.headers;
          if (authorization) {
            const tmp = authorization.split(" ");
            if (tmp.length === 2 && tmp[0] === "Bearer") {
              const { dataSource } = req.app.locals;
              const sessionRepository = dataSource.getRepository(Session);
              const session = await sessionRepository.findOneBy({
                accessToken: tmp[1],
              });
              if (!session) {
                throw new GoneError("session gone");
              }
              // verify token
              const decode: any = verify(tmp[1], config.jwtAccessKey);

              const allRoleAndPermission = await getRolesAndPermissionsByUser({
                dataSource,
                userId: decode.iss,
              });
              res.locals.session = {
                userId: decode.iss,
                employeeId: session.employeeId,
                departments: session.departments,
                projects: session.projects,
                ...allRoleAndPermission,
                accessToken: tmp[1],
              };
            }
          }
          next();
        } catch (error) {
          console.log(error);

          next(error);
        }
      }
    );
  }

  private registerRouters(): void {
    for (let iar = 0; iar < appRouters.length; iar++) {
      const { rootPath, controllers } = appRouters[iar];
      for (let ic = 0; ic < controllers.length; ic++) {
        const controllerClass = controllers[ic];
        const controllerInstance: { [handleName: string]: Handler } =
          new controllerClass() as any;

        const basePath: string = Reflect.getMetadata(
          MetadataKeys.BASE_PATH,
          controllerClass
        );
        const authenticate: string = Reflect.getMetadata(
          MetadataKeys.AUTHENTICATE,
          controllerClass
        );
        const routers: IRouter[] = Reflect.getMetadata(
          MetadataKeys.ROUTERS,
          controllerClass
        );
        const authorizes: IAuthorize[] =
          Reflect.getMetadata(MetadataKeys.AUTHORIZE, controllerClass) || [];

        const exRouter = express.Router();

        for (let ir = 0; ir < routers.length; ir++) {
          const { method, path, handlerName } = routers[ir];
          exRouter[method](
            path,
            (req: Request, res: Response, next: NextFunction) => {
              let requiredPermissions: IUserPermission[] | string =
                authenticate;
              for (let i = 0; i < authorizes.length; i++) {
                if (authorizes[i].handlerName === handlerName) {
                  requiredPermissions = authorizes[i].permissions;
                }
              }

              // check permission
              if (requiredPermissions) {
                if (!res.locals?.session?.roles) {
                  throw new UnauthorizedError();
                }
                const { permissions } = res.locals?.session;

                if (Array.isArray(requiredPermissions) && permissions) {
                  let notMatchAnyPermission = true;

                  const { employeeId: requestEmployeeId } = req.params;
                  const { employeeId } = res.locals?.session;

                  if (employeeId === requestEmployeeId)
                    notMatchAnyPermission = false;

                  requiredPermissions.forEach((requiredPermission) => {
                    const currentPermissions = permissions.find(
                      (obj: IUserPermission) =>
                        obj.permission === requiredPermission.permission
                    );
                    if (currentPermissions) {
                      for (const key in currentPermissions) {
                        if (
                          key !== "permission" &&
                          Object.keys(requiredPermission).includes(key)
                        ) {
                          notMatchAnyPermission = false;
                          break;
                        }
                      }
                    }
                  });

                  if (notMatchAnyPermission) {
                    throw new ForbiddenError();
                  }
                }
              }
              next();
            },
            controllerInstance[String(handlerName)].bind(controllerInstance),
            (req: Request, res: Response) => {
              res.json({
                status: 200,
                success: true,
                message: res.locals.message || "Success",
                data: res.locals.data || null,
                session: res.locals.session,
              });
            }
          );
        }
        this._instance.use(`${rootPath}${basePath}`, exRouter);
      }
    }
  }

  private handleErrors(): void {
    this._instance.use(
      (err: Error, req: Request, res: Response, next: NextFunction) => {
        let statusCode = 503;
        if (err instanceof BadRequestError) {
          statusCode = 400;
        } else if (
          err instanceof UnauthorizedError ||
          err instanceof TokenExpiredError
        ) {
          statusCode = 401;
        } else if (err instanceof ForbiddenError) {
          statusCode = 403;
        } else if (err instanceof NotFoundError) {
          statusCode = 404;
        } else if (err instanceof MethodNotAllowedError) {
          statusCode = 405;
        } else if (err instanceof NotAcceptableError) {
          statusCode = 406;
        } else if (err instanceof GoneError) {
          statusCode = 410;
        } else if (err instanceof InternalServerError) {
          statusCode = 500;
        }

        res.status(statusCode).json({
          status: statusCode,
          success: false,
          message: err.message || "Failure",
          data: null,
          session: res.locals.session,
        });
      }
    );
  }
}

export default new Application();

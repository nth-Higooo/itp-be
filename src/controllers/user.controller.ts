import { NextFunction, Request, Response } from "express";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import Controller from "../decorators/controller";
import { Delete, Get, Post, Put } from "../decorators/handlers";
import { User, UserStatus } from "../database/entities/User";
import {
  ForbiddenError,
  NotAcceptableError,
  NotFoundError,
} from "../utils/errors";
import { sendMail } from "../utils/email";
import config from "../configuration";
import { generateUniqueString, getHashPassword } from "../utils";
import { UserPermission } from "../utils/permission";
import { FindManyOptions, ILike, IsNull, Not } from "typeorm";
import { Session } from "../database/entities/Session";
import { Role } from "../database/entities/Role";

@Controller("/users")
@Authenticate()
export default class UserController {
  @Get("/")
  @Authorize([{ permission: UserPermission.USER_MANAGEMENT, canRead: true }])
  public async index(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const {
        pageSize,
        pageIndex,
        status,
        role,
        name,
        sortBy = "displayName",
        orderBy = "asc",
      } = req.query;

      const userRepository = dataSource.getRepository(User);

      let criteria: FindManyOptions<User> = {
        skip:
          pageSize && pageIndex
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined,
        take: pageSize && pageIndex ? Number(pageSize) : undefined,
        relations: {
          roles: true,
        },
        where: {},
      };

      if (sortBy) {
        criteria = {
          ...criteria,
          order: {
            [sortBy as string]: orderBy,
          },
        };
      }
      if (status && status !== "ALL") {
        if (status === "TRASH") {
          criteria = {
            ...criteria,
            withDeleted: true,
            where: {
              ...criteria.where,
              deletedAt: Not(IsNull()),
            },
          };
        } else {
          criteria = {
            ...criteria,
            where: {
              ...criteria.where,
              status: UserStatus[status as keyof typeof UserStatus],
            },
          };
        }
      }
      if (name) {
        criteria = {
          ...criteria,
          where: {
            ...criteria.where,
            displayName: ILike(`%${name}%`),
          },
        };
      }
      if (role) {
        criteria = {
          ...criteria,
          where: {
            ...criteria.where,
            roles: {
              id: role,
            } as Role,
          },
        };
      }

      const [users, count] = await userRepository.findAndCount(criteria);

      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count,
        users: users.map((user: User) => {
          const { hashPassword, resetToken, ...restUser } = user;
          return restUser;
        }),
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Get("/count-all-status")
  @Authorize([{ permission: UserPermission.USER_MANAGEMENT, canRead: true }])
  public async countAllStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { roleId } = req.query;

      const userRepository = dataSource.getRepository(User);

      const userQuery = userRepository
        .createQueryBuilder("user")
        .leftJoinAndSelect("user.roles", "roles");

      if (roleId) {
        userQuery.where("roles.id = :roleId", { roleId });
      }

      const userQuery_1 = userQuery.clone();
      const userQuery_2 = userQuery.clone();
      const userQuery_3 = userQuery.clone();
      const userQuery_4 = userQuery.clone();
      const userQuery_5 = userQuery.clone();

      const [total, totalActive, totalPending, totalDisabled, totalDeleted] =
        await Promise.all([
          userQuery_1.getCount(),
          userQuery_2
            .where("user.status = :status", {
              status: UserStatus.ACTIVE,
            })
            .getCount(),
          userQuery_3
            .where("user.status = :status", {
              status: UserStatus.PENDING,
            })
            .getCount(),
          userQuery_4
            .where("user.status = :status", {
              status: UserStatus.DISABLED,
            })
            .getCount(),
          userQuery_5
            .withDeleted()
            .where("user.deletedAt IS NOT NULL")
            .getCount(),
        ]);

      res.locals.data = {
        total,
        totalActive,
        totalPending,
        totalDisabled,
        totalDeleted,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/")
  @Authorize([{ permission: UserPermission.USER_MANAGEMENT, canCreate: true }])
  public async add(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, displayName, roles, avatar } = req.body;
      const { session } = res.locals;
      const { dataSource, nodeMailer } = req.app.locals;

      const userRepository = dataSource.getRepository(User);

      const emailExist = await userRepository.findOneBy({ email });
      if (emailExist) {
        throw new NotAcceptableError("Email already in use.");
      }

      // TODO: send mail
      const resetToken = generateUniqueString();
      const urlReset = `${config.clientSite}/auth/new-password/${resetToken}`;
      await sendMail({
        nodeMailer,
        emails: email,
        template: "NewPassword",
        data: {
          subject: "[ERP] Account was created for you",
          displayName,
          urlReset,
        },
      });

      const user = userRepository.create({
        email,
        hashPassword: getHashPassword(generateUniqueString(12)),
        resetToken,
        displayName,
        roles,
        avatar,
        createdBy: session.userId,
      });
      await userRepository.save(user);

      res.locals.data = {
        user,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Get("/:id/resend-email")
  @Authorize([{ permission: UserPermission.USER_MANAGEMENT, canCreate: true }])
  public async resendEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource, nodeMailer } = req.app.locals;

      const userRepository = dataSource.getRepository(User);

      const user = await userRepository.findOneBy({ id });

      if (!user) {
        throw new NotFoundError("User is not found.");
      }

      // TODO: send mail
      const resetToken = generateUniqueString();
      const urlReset = `${config.clientSite}/auth/new-password/${resetToken}`;
      await sendMail({
        nodeMailer,
        emails: user.email,
        template: "NewPassword",
        data: {
          subject: "[ERP] Account was created for you",
          email: user.email,
          urlReset,
        },
      });

      userRepository.merge(user, { resetToken });

      await userRepository.save(user);

      next();
    } catch (error) {
      next(error);
    }
  }

  @Get("/:id")
  @Authorize([{ permission: UserPermission.USER_MANAGEMENT, canRead: true }])
  public async findById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;
      const userRepository = dataSource.getRepository(User);

      const user = await userRepository.findOne({
        relations: ["roles"],
        where: { id },
      });

      if (!user) {
        throw new NotFoundError("User is not found.");
      }

      res.locals.data = {
        user,
      };

      next();
    } catch (error) {
      next(error);
    }
    next();
  }

  @Put("/:id")
  @Authorize([{ permission: UserPermission.USER_MANAGEMENT, canUpdate: true }])
  public async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { email, status, displayName, roles, avatar } = req.body;
      const { dataSource } = req.app.locals;
      const userRepository = dataSource.getRepository(User);
      const sessionRepository = dataSource.getRepository(Session);

      const user = await userRepository.findOne({
        relations: ["roles"],
        where: { id },
      });

      if (!user) {
        throw new NotFoundError("User is not found.");
      }

      if (email) {
        const emailExist = await userRepository.findOneBy({ email });
        if (emailExist && emailExist.id !== id) {
          throw new NotAcceptableError("Email already in use.");
        }
      }

      // check administrator left
      const administratorRole = user.roles.find(
        (role: Role) => role.name === "Administrator"
      );
      if (administratorRole) {
        const countAdmin = await userRepository.count({
          relations: ["roles"],
          where: { roles: { id: administratorRole.id } },
        });

        if (countAdmin < 2 && status !== UserStatus.ACTIVE) {
          throw new ForbiddenError(
            "This is the only Administrator account left. Can not change status this one!"
          );
        }

        const rolesRequest = roles.find(
          (role: Role) => role.name === "Administrator"
        );
        if (countAdmin < 2 && !rolesRequest) {
          throw new ForbiddenError(
            "This is the only Administrator account left. Can not remove Administrator role for this one!"
          );
        }
      }

      // Delete all session when change status
      if (status) {
        if (user.status !== status) {
          await sessionRepository.delete({
            email: user.email,
          });
        }
      }

      userRepository.merge(user, {
        email,
        status,
        displayName,
        avatar,
      });

      // merge is concat array of roles => can update role
      if (roles) {
        user.roles = roles;
      }

      res.locals.data = {
        user: await userRepository.save(user),
      };

      next();
    } catch (error) {
      next(error);
    }
    next();
  }

  @Delete("/:id")
  @Authorize([{ permission: UserPermission.USER_MANAGEMENT, canDelete: true }])
  public async delete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;
      const { session } = res.locals;

      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOne({
        relations: ["roles"],
        where: { id },
      });
      if (!user) {
        throw new NotFoundError("User is not found.");
      }

      // check your
      if (user.id === session.userId) {
        throw new ForbiddenError("Can not delete your account!");
      }

      // check administrator left
      const administratorRole = user.roles.find(
        (role: Role) => role.name === "Administrator"
      );
      if (administratorRole) {
        const countAdmin = await userRepository.count({
          relations: ["roles"],
          where: { roles: { id: administratorRole.id } },
        });

        if (countAdmin < 2) {
          throw new ForbiddenError(
            "This is the only Administrator account left. Can not delete this one!"
          );
        }
      }

      await userRepository.softDelete({ id });

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id/permanently")
  @Authorize([
    {
      permission: UserPermission.USER_MANAGEMENT,
      canPermanentlyDelete: true,
    },
  ])
  public async hardDelete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;

      const userRepository = dataSource.getRepository(User);

      const user: User | null = await userRepository
        .createQueryBuilder("user")
        .withDeleted()
        .where("user.id = :id", { id })
        .andWhere("user.deletedAt IS NOT NULL")
        .getOne();
      if (!user) {
        throw new NotFoundError("User is not found.");
      }

      await userRepository.delete(user.id);

      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id/restore")
  @Authorize([{ permission: UserPermission.USER_MANAGEMENT, canRestore: true }])
  public async restore(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;

      const userRepository = dataSource.getRepository(User);

      const user: User | null = await userRepository
        .createQueryBuilder("user")
        .withDeleted()
        .where("user.id = :id", { id })
        .andWhere("user.deletedAt IS NOT NULL")
        .getOne();

      if (!user) {
        throw new NotFoundError("User is not found.");
      }

      await userRepository.restore(user.id);

      next();
    } catch (error) {
      next(error);
    }
  }
}

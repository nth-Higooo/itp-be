import { NextFunction, Request, Response } from "express";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import Controller from "../decorators/controller";
import { Delete, Get, Post, Put } from "../decorators/handlers";
import { UserPermission } from "../utils/permission";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { Education } from "../database/entities/Education";
import { Degree } from "../database/entities/Degree";
import { Not } from "typeorm";

@Controller("/degrees")
@Authenticate()
export default class DegreeController {
  @Get("/")
  @Authorize([{ permission: UserPermission.DEGREE_MANAGEMENT, canRead: true }])
  public async get(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { pageSize, pageIndex } = req.query;

      const degreeRepository = dataSource.getRepository(Degree);

      const [degrees, count] = await degreeRepository.findAndCount({
        order: { name: "ASC" },
        skip:
          pageSize && pageIndex
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined,
        take: pageSize && pageIndex ? Number(pageSize) : undefined,
      });

      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count,
        degrees,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/")
  @Authorize([
    { permission: UserPermission.DEGREE_MANAGEMENT, canCreate: true },
  ])
  public async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { name } = req.body;

      const degreeRepository = dataSource.getRepository(Degree);

      const degreeNameExist: Degree | null = await degreeRepository.findOne({
        where: { name },
      });
      if (degreeNameExist) {
        throw new BadRequestError("Degree name is already exist.");
      }

      const degree: Degree = degreeRepository.create({
        name,
      });
      await degreeRepository.save(degree);

      res.locals.message = "Create Degree successfully.";
      res.locals.data = {
        degree,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id")
  @Authorize([
    { permission: UserPermission.DEGREE_MANAGEMENT, canUpdate: true },
  ])
  public async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const { dataSource } = req.app.locals;

      const degreeRepository = dataSource.getRepository(Degree);

      const degree: Degree | null = await degreeRepository.findOne({
        where: {
          id,
        },
      });
      if (!degree) {
        throw new NotFoundError("Degree is not found.");
      }

      const degreeNameExist: Degree | null = await degreeRepository.findOne({
        where: { id: Not(id), name },
      });
      if (degreeNameExist) {
        throw new BadRequestError("Degree name is already exist.");
      }

      degreeRepository.merge(degree, {
        name,
      });
      await degreeRepository.save(degree);

      res.locals.message = "Update Degree successfully.";
      res.locals.data = {
        degree,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id")
  @Authorize([
    {
      permission: UserPermission.DEGREE_MANAGEMENT,
      canDelete: true,
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

      const degreeRepository = dataSource.getRepository(Degree);
      const educationRepository = dataSource.getRepository(Education);

      const degree: Degree | null = await degreeRepository.findOne({
        where: {
          id,
        },
      });
      if (!degree) {
        throw new NotFoundError("Degree is not found.");
      }

      const educations: Education[] = await educationRepository.find({
        where: {
          degree: {
            id,
          },
        },
      });
      if (educations.length > 0) {
        throw new BadRequestError("Degree is being used by Education.");
      }

      await degreeRepository.remove(degree);

      res.locals.message = "Delete Degree successfully.";

      next();
    } catch (error) {
      next(error);
    }
  }
}

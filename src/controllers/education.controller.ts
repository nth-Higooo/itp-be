import { NextFunction, Request, Response } from "express";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import Controller from "../decorators/controller";
import { Delete, Get, Post, Put } from "../decorators/handlers";
import { UserPermission } from "../utils/permission";
import { Employee } from "../database/entities/Employee";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { omit } from "../utils";
import { Education } from "../database/entities/Education";
import { Degree } from "../database/entities/Degree";
import { IsNull, Not } from "typeorm";

@Controller("/educations")
@Authenticate()
export default class EducationController {
  @Get("/")
  @Authorize([
    { permission: UserPermission.EDUCATION_MANAGEMENT, canRead: true },
  ])
  public async getByEmployeeId(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const {
        employeeId,
        type = "ALL",
        sortBy = "toYear",
        orderBy = "desc",
      } = req.query;

      const educationRepository = dataSource.getRepository(Education);
      const employeeRepository = dataSource.getRepository(Employee);

      if (!employeeId) {
        throw new BadRequestError("Employee ID is required.");
      }

      const employee: Employee | null = await employeeRepository.findOne({
        where: { id: employeeId.toString() },
      });
      if (!employee) {
        throw new NotFoundError("Employee is not found.");
      }

      const educations: Education[] = await educationRepository.find({
        relations: ["degree"],
        where: {
          employee: {
            id: employeeId.toString(),
          },
          degree:
            type === "CERTIFICATE"
              ? IsNull()
              : type === "EDUCATION"
              ? Not(IsNull())
              : undefined,
        },
        order: {
          [sortBy as string]: orderBy,
        },
      });

      res.locals.data = {
        educations,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/")
  @Authorize([
    { permission: UserPermission.EDUCATION_MANAGEMENT, canCreate: true },
  ])
  public async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const {
        employeeId,
        school,
        major,
        degreeId,
        fromYear,
        toYear,
        certificateName,
        certificateWebsite,
      } = req.body;

      const employeeRepository = dataSource.getRepository(Employee);
      const educationRepository = dataSource.getRepository(Education);
      const degreeRepository = dataSource.getRepository(Degree);

      const employee: Employee | null = await employeeRepository.findOne({
        where: { id: employeeId },
      });
      if (!employee) {
        throw new NotFoundError("Employee is not found.");
      }

      let degree: Degree | null = null;
      if (degreeId) {
        degree = await degreeRepository.findOne({
          where: { id: degreeId },
        });
        if (!degree) {
          throw new NotFoundError("Degree is not found.");
        }
      }

      const education = educationRepository.create({
        employee,
        school,
        major,
        degree: degree ?? undefined,
        fromYear,
        toYear,
        certificateName,
        certificateWebsite,
      });
      await educationRepository.save(education);

      res.locals.data = {
        education: {
          ...omit(education, ["employee"]),
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id")
  @Authorize([
    { permission: UserPermission.EDUCATION_MANAGEMENT, canUpdate: true },
  ])
  public async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const {
        school,
        major,
        degreeId,
        fromYear,
        toYear,
        certificateName,
        certificateWebsite,
      } = req.body;
      const { dataSource } = req.app.locals;

      const educationRepository = dataSource.getRepository(Education);
      const degreeRepository = dataSource.getRepository(Degree);

      const education: Education | null = await educationRepository.findOne({
        where: {
          id,
        },
      });
      if (!education) {
        throw new NotFoundError("Education, Certificate is not found.");
      }

      let degree: Degree | null = null;
      if (degreeId) {
        degree = await degreeRepository.findOne({
          where: { id: degreeId },
        });
        if (!degree) {
          throw new NotFoundError("Degree is not found.");
        }
      }

      educationRepository.merge(education, {
        school,
        major,
        degree: degree ?? undefined,
        fromYear,
        toYear,
        certificateName,
        certificateWebsite,
      });
      await educationRepository.save(education);

      res.locals.data = {
        education,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id")
  @Authorize([
    {
      permission: UserPermission.EDUCATION_MANAGEMENT,
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

      const educationRepository = dataSource.getRepository(Education);

      const education: Education | null = await educationRepository.findOne({
        where: {
          id,
        },
      });
      if (!education) {
        throw new NotFoundError("Education, Certificate is not found.");
      }

      await educationRepository.remove(education);

      res.locals.message = "Delete Education, Certificate successfully.";

      next();
    } catch (error) {
      next(error);
    }
  }
}

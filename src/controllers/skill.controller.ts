import { NextFunction, Request, Response } from "express";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import Controller from "../decorators/controller";
import { Delete, Get, Post, Put } from "../decorators/handlers";
import { UserPermission } from "../utils/permission";
import { NotAcceptableError, NotFoundError } from "../utils/errors";
import { ILike } from "typeorm";
import { Skill } from "../database/entities/Skill";
import { Employee } from "../database/entities/Employee";
import { omit } from "../utils";
import { SkillLevel } from "../database/entities/SkillLevel";

@Controller("/skills")
@Authenticate()
export default class SkillController {
  @Authorize([{ permission: UserPermission.SKILL_MANAGEMENT, canRead: true }])
  @Get("/")
  public async get(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const {
        employeeId,
        pageSize,
        pageIndex,
        search,
        sortBy = "skillName",
        orderBy = "asc",
      } = req.query;

      const skillRepository = dataSource.getRepository(Skill);
      const employeeRepository = dataSource.getRepository(Employee);

      if (!employeeId) {
        throw new NotAcceptableError("Employee ID is required");
      }

      const employee: Employee | null = await employeeRepository.findOne({
        where: { id: employeeId.toString() },
      });
      if (!employee) {
        throw new NotFoundError("Employee is not found");
      }

      const [skills, skillCount] = await skillRepository.findAndCount({
        relations: ["skillLevel", "employee", "skillLevel.skillType"],
        where: {
          skillLevel: {
            skillType: search ? { skillName: ILike(`%${search}%`) } : undefined,
          },
          employee: {
            id: employeeId.toString(),
          },
        },
        order: {
          skillLevel: {
            skillType: {
              [sortBy as string]: orderBy,
            },
          },
        },
        skip:
          pageSize && pageIndex
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined,
        take: pageSize && pageIndex ? Number(pageSize) : undefined,
      });

      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count: skillCount,
        skills: skills.map((skill: Skill) => omit(skill, ["employee"])),
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([{ permission: UserPermission.SKILL_MANAGEMENT, canCreate: true }])
  @Post("/")
  public async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { employeeId, skillLevelId, isMainSkill = false } = req.body;

      const skillRepository = dataSource.getRepository(Skill);
      const employeeRepository = dataSource.getRepository(Employee);
      const skillLevelRepository = dataSource.getRepository(SkillLevel);

      if (!employeeId) {
        throw new NotAcceptableError("Employee ID is required");
      }

      if (!skillLevelId) {
        throw new NotAcceptableError("Skill level ID is required");
      }

      const employee: Employee | null = await employeeRepository.findOne({
        where: { id: employeeId },
      });
      if (!employee) {
        throw new NotFoundError("Employee is not found");
      }

      const skillLevel: SkillLevel | null = await skillLevelRepository.findOne({
        relations: ["skillType"],
        where: { id: skillLevelId },
      });
      if (!skillLevel) {
        throw new NotFoundError("Skill level is not found");
      }

      const skill: Skill = skillRepository.create({
        employee,
        skillLevel,
        isMainSkill,
      });
      await skillRepository.save(skill);

      res.locals.message = "Skill created successfully";
      res.locals.data = {
        skill: {
          ...omit(skill, ["employee"]),
          employee: {
            id: employee.id,
            fullName: employee.fullName,
          },
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([{ permission: UserPermission.SKILL_MANAGEMENT, canUpdate: true }])
  @Put("/:id")
  public async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;
      const { skillLevelId, isMainSkill = false } = req.body;

      const skillRepository = dataSource.getRepository(Skill);
      const skillLevelRepository = dataSource.getRepository(SkillLevel);

      const skill: Skill | null = await skillRepository.findOne({
        relations: ["skillLevel"],
        where: { id },
      });
      if (!skill) {
        throw new NotFoundError("Skill is not found");
      }

      if (skillLevelId) {
        const skillLevel: SkillLevel | null =
          await skillLevelRepository.findOne({
            relations: ["skillType"],
            where: { id: skillLevelId },
          });
        if (!skillLevel) {
          throw new NotFoundError("Skill Level is not found");
        }

        skillRepository.merge(skill, {
          skillLevel,
        });
      }

      skillRepository.merge(skill, {
        isMainSkill,
      });
      await skillRepository.save(skill);

      res.locals.message = "Skill updated successfully";
      res.locals.data = {
        skill,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id")
  @Authorize([
    {
      permission: UserPermission.SKILL_MANAGEMENT,
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

      const skillRepository = dataSource.getRepository(Skill);

      const skill = await skillRepository.findOne({ where: { id } });
      if (!skill) {
        throw new NotFoundError("Skill is not found.");
      }

      await skillRepository.remove(skill);

      res.locals.message = "Skill was deleted successfully.";

      next();
    } catch (error) {
      next(error);
    }
  }
}

import { NextFunction, Request, Response } from "express";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import Controller from "../decorators/controller";
import { Delete, Get, Post, Put } from "../decorators/handlers";
import { UserPermission } from "../utils/permission";
import { NotAcceptableError, NotFoundError } from "../utils/errors";
import { ILike, In, IsNull, Not } from "typeorm";
import { SkillType } from "../database/entities/SkillType";
import { Skill } from "../database/entities/Skill";
import { SkillLevel } from "../database/entities/SkillLevel";
import { omit } from "../utils";

@Controller("/skill-types")
@Authenticate()
export default class SkillTypeController {
  @Authorize([
    { permission: UserPermission.SKILL_TYPE_MANAGEMENT, canRead: true },
  ])
  @Get("/")
  public async get(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const {
        pageSize,
        pageIndex,
        search,
        sortBy = "orderNumber",
        orderBy = "asc",
        isFilter = false,
      } = req.query;

      const skillTypeRepository = dataSource.getRepository(SkillType);

      const [parents, parentCount] = await skillTypeRepository.findAndCount({
        where: {
          name: search && !isFilter ? ILike(`%${search}%`) : undefined,
          parentId: IsNull(),
        },
        order: {
          [sortBy as string]: orderBy,
        },
        skip:
          pageSize && pageIndex && !isFilter
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined,
        take: pageSize && pageIndex && !isFilter ? Number(pageSize) : undefined,
      });

      const children = await Promise.all(
        parents.map((parent: SkillType) =>
          skillTypeRepository.find({
            relations: ["levels"],
            where: {
              parentId: parent.id,
            },
            order: {
              orderNumber: "ASC",
            },
          })
        )
      );

      children.forEach((item_1: SkillType[]) => {
        item_1.forEach((item_2: SkillType) => {
          item_2.levels = item_2.levels.sort((a: SkillLevel, b: SkillLevel) => {
            return a.orderNumber - b.orderNumber;
          });
        });
      });

      let skillTypes: any[] = [];

      if (isFilter) {
        skillTypes = parents.flatMap((parent: SkillType, index: number) => [
          parent,
          ...children[index],
        ]);
      } else {
        skillTypes = parents.map((parent: SkillType, index: number) => ({
          ...parent,
          skillNames: children[index],
        }));
      }
      res.locals.data = {
        ...(!isFilter && {
          pageSize: Number(pageSize),
          pageIndex: Number(pageIndex),
          count: parentCount,
        }),
        skillTypes,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.SKILL_TYPE_MANAGEMENT, canCreate: true },
  ])
  @Post("/")
  public async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { name, orderNumber = 0, skillNames } = req.body;
      const { dataSource } = req.app.locals;

      const skillTypeRepository = dataSource.getRepository(SkillType);

      const skillTypeNameExist: SkillType | null =
        await skillTypeRepository.findOne({ where: { name } });
      if (skillTypeNameExist) {
        throw new NotAcceptableError("Skill type name already exists!");
      }

      const parentSkillType: SkillType = skillTypeRepository.create({
        name,
        orderNumber,
      });
      await skillTypeRepository.save(parentSkillType);

      const childrenSkillType: SkillType[] = skillNames.map(
        (
          item: {
            id: string | null;
            skillName: string;
          },
          index: number
        ): SkillType => {
          return skillTypeRepository.create({
            name,
            orderNumber: index,
            skillName: item.skillName,
            parentId: parentSkillType.id,
          });
        }
      );
      await skillTypeRepository.save(childrenSkillType);

      res.locals.message = "Skill type created successfully";
      res.locals.data = {
        skillType: {
          ...parentSkillType,
          skillNames: childrenSkillType,
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.SKILL_TYPE_MANAGEMENT, canUpdate: true },
  ])
  @Put("/:id")
  public async updateParent(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { name, orderNumber = 0, skillNames } = req.body;
      const { dataSource } = req.app.locals;

      const skillTypeRepository = dataSource.getRepository(SkillType);
      const skillLevelRepository = dataSource.getRepository(SkillLevel);

      const skillTypeNameExist: SkillType | null =
        await skillTypeRepository.findOne({
          where: { id: Not(id), name, parentId: IsNull() },
        });
      if (skillTypeNameExist) {
        throw new NotAcceptableError("Skill type name already exists");
      }

      const skillType: SkillType | null = await skillTypeRepository.findOne({
        where: { id },
      });
      if (!skillType) {
        throw new NotFoundError("Skill Type is not found");
      }

      const skillNamesIdNotNull = skillNames.filter(
        (item: { id: string | null; skillName: string }) => item.id
      );

      const skillNamesIdNull = skillNames.filter(
        (item: { id: string | null; skillName: string }) => !item.id
      );

      const childrenSkillType: SkillType[] = await skillTypeRepository.find({
        where: { parentId: id },
      });

      const skillNamesForUpdate: SkillType[] = childrenSkillType.filter(
        (childSkillType: SkillType) =>
          skillNamesIdNotNull.find(
            (item: { id: string; skillName: string }) =>
              item.id === childSkillType.id
          )
      );

      if (skillNamesForUpdate.length !== skillNamesIdNotNull.length) {
        throw new NotAcceptableError("Some levels are not found.");
      }

      const updateChildrenSkillType: SkillType[] = skillNamesForUpdate.map(
        (item: SkillType) => {
          const skillName = skillNames.find(
            (skillName: { id: string; skillName: string }) =>
              skillName.id === item.id
          );

          return skillTypeRepository.merge(item, {
            name,
            skillName: skillName.skillName,
            orderNumber: skillNames.indexOf(skillName),
            parentId: id,
          });
        }
      );

      const newChildrenSkillType: SkillType[] = skillNamesIdNull.map(
        (skillName: { id: null; skillName: string }) => {
          return skillTypeRepository.create({
            name,
            skillName: skillName.skillName,
            orderNumber: skillNames.indexOf(skillName),
            parentId: id,
          });
        }
      );

      const deleteChildrenSkillType: SkillType[] = childrenSkillType.filter(
        (childSkillType: SkillType) => {
          return !skillNames.find(
            (skillName: { id: string | null; skillName: string }) =>
              skillName.id === childSkillType.id
          );
        }
      );

      const deleteChildrenSkillTypeIds: string[] = deleteChildrenSkillType.map(
        (childSkillType: SkillType) => childSkillType.id
      );
      const deleteChildrenSkillTypeSkillNames: string[] =
        deleteChildrenSkillType.map(
          (childSkillType: SkillType) => childSkillType.skillName
        );

      if (deleteChildrenSkillTypeIds.length > 0) {
        const skillLevels: SkillLevel[] = await skillLevelRepository
          .createQueryBuilder("skill_levels")
          .innerJoinAndSelect("skill_levels.skills", "skills")
          .innerJoinAndSelect("skill_levels.skillType", "skillType")
          .where("skillType.id IN (:...skillTypeIds)", {
            skillTypeIds: deleteChildrenSkillTypeIds,
          })
          .getMany();
        if (skillLevels.length > 0) {
          throw new NotAcceptableError(
            `Skill name: ${deleteChildrenSkillTypeSkillNames.join(
              ", "
            )} cannot be deleted because it is being used by employee skills.`
          );
        }
      }

      skillTypeRepository.merge(skillType, {
        name,
        orderNumber,
      });

      await Promise.all([
        skillTypeRepository.save(skillType),
        skillTypeRepository.save(updateChildrenSkillType),
        skillTypeRepository.remove(deleteChildrenSkillType),
        skillTypeRepository.save(newChildrenSkillType),
      ]);

      const childrenSkillTypeAfterUpdate: SkillType[] =
        await skillTypeRepository.find({
          where: { parentId: id },
          order: { orderNumber: "ASC" },
        });

      res.locals.data = {
        skillType: {
          ...skillType,
          skillNames: childrenSkillTypeAfterUpdate,
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.SKILL_TYPE_MANAGEMENT, canUpdate: true },
  ])
  @Put("/child/:id")
  public async updateChild(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { skillName, levels } = req.body;
      const { dataSource } = req.app.locals;

      const skillTypeRepository = dataSource.getRepository(SkillType);
      const skillLevelRepository = dataSource.getRepository(SkillLevel);
      const skillRepository = dataSource.getRepository(Skill);

      const skillType: SkillType | null = await skillTypeRepository.findOne({
        relations: ["levels"],
        where: { id },
      });
      if (!skillType) {
        throw new NotFoundError("Skill Type is not found");
      }

      const skillTypeNameExist: SkillType | null =
        await skillTypeRepository.findOne({
          where: { id: Not(id), skillName, parentId: id },
        });
      if (skillTypeNameExist) {
        throw new NotAcceptableError(
          "Skill name already exists in the same level"
        );
      }

      const levelsIdNotNull = levels.filter(
        (itemLevel: { id: string | null; level: string }) => itemLevel.id
      );

      const levelsIdNull = levels.filter(
        (itemLevel: { id: string | null; level: string }) => !itemLevel.id
      );

      const skillLevels: SkillLevel[] = skillType.levels;

      const levelsForUpdate: SkillLevel[] = skillLevels.filter(
        (skillLevel: SkillLevel) =>
          levelsIdNotNull.find(
            (itemLevel: { id: string; level: string }) =>
              itemLevel.id === skillLevel.id
          )
      );

      if (levelsForUpdate.length !== levelsIdNotNull.length) {
        throw new NotAcceptableError("Some levels are not found.");
      }

      const updateSkillLevels: SkillLevel[] = levelsForUpdate.map(
        (item: SkillLevel) => {
          const targetLevel = levels.find(
            (itemLevel: { id: string; level: string }) =>
              itemLevel.id === item.id
          );

          return skillLevelRepository.merge(item, {
            level: targetLevel.level,
            orderNumber: levels.indexOf(targetLevel),
          });
        }
      );

      const newSkillLevels: SkillLevel[] = levelsIdNull.map(
        (itemLevel: { id: null; level: string }) => {
          return skillLevelRepository.create({
            level: itemLevel.level,
            orderNumber: levels.indexOf(itemLevel),
            skillType,
          });
        }
      );

      const deleteSkillLevels: SkillLevel[] = skillLevels.filter(
        (skillLevel: SkillLevel) => {
          return !levels.find(
            (itemLevel: { id: string | null; level: string }) =>
              itemLevel.id === skillLevel.id
          );
        }
      );

      const deleteSkillLevelIds: string[] = deleteSkillLevels.map(
        (skillLevel: SkillLevel) => skillLevel.id
      );
      const deleteSkillLevelsName: string[] = deleteSkillLevels.map(
        (skillLevel: SkillLevel) => skillLevel.level
      );

      if (deleteSkillLevelIds.length > 0) {
        const skills: Skill[] = await skillRepository.find({
          where: {
            skillLevel: {
              id: In(deleteSkillLevelIds),
            },
          },
        });

        if (skills.length > 0) {
          throw new NotAcceptableError(
            `Skill levels: ${deleteSkillLevelsName.join(
              ", "
            )} cannot be deleted because it is being used by employee skills.`
          );
        }
      }

      skillTypeRepository.merge(skillType, {
        skillName,
      });

      await Promise.all([
        skillTypeRepository.save(skillType),
        skillLevelRepository.save(updateSkillLevels),
        skillLevelRepository.remove(deleteSkillLevels),
        skillLevelRepository.save(newSkillLevels),
      ]);

      const skillLevelAfterUpdate: SkillLevel[] =
        await skillLevelRepository.find({
          where: {
            skillType: {
              id,
            },
          },
          order: { orderNumber: "ASC" },
        });

      res.locals.message = "Skill type updated successfully";
      res.locals.data = {
        skillType: {
          ...omit(skillType, ["levels"]),
          levels: skillLevelAfterUpdate,
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id")
  @Authorize([
    {
      permission: UserPermission.SKILL_TYPE_MANAGEMENT,
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

      const skillTypeRepository = dataSource.getRepository(SkillType);
      const skillLevelRepository = dataSource.getRepository(SkillLevel);
      const parent = await skillTypeRepository.findOne({ where: { id } });
      if (!parent) {
        throw new NotFoundError("Skill type is not found.");
      }

      const children: SkillType[] = await skillTypeRepository.find({
        where: {
          parentId: id,
        },
      });

      const skillTypeIds = [parent, ...children].map(
        (skillType: SkillType) => skillType.id
      );

      const skillTypeNames = [parent, ...children].map(
        (skillType: SkillType) => skillType.skillName
      );

      const skillLevels: SkillLevel[] = await skillLevelRepository
        .createQueryBuilder("skill_levels")
        .innerJoinAndSelect("skill_levels.skills", "skills")
        .innerJoinAndSelect("skill_levels.skillType", "skillType")
        .where("skillType.id IN (:...skillTypeIds)", {
          skillTypeIds,
        })
        .getMany();
      if (skillLevels.length > 0) {
        throw new NotAcceptableError(
          `Skill name: ${skillTypeNames.join(
            ", "
          )} cannot be deleted because it is being used by employee skills.`
        );
      }

      await skillTypeRepository.remove([parent, ...children]);

      res.locals.message = "Skill type was deleted successfully.";

      next();
    } catch (error) {
      next(error);
    }
  }
}

import { NextFunction, Request, Response } from "express";
import Controller from "../decorators/controller";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import { UserPermission } from "../utils/permission";
import { Delete, Get, Post, Put } from "../decorators/handlers";
import { Position } from "../database/entities/Position";
import { ILike, In, IsNull, Not } from "typeorm";
import { NotAcceptableError, NotFoundError } from "../utils/errors";
import { checkPermission, decryptSalary, encryptSalary, omit } from "../utils";
import { Employee } from "../database/entities/Employee";

@Controller("/positions")
@Authenticate()
export default class PositionController {
  @Authorize([
    { permission: UserPermission.POSITION_MANAGEMENT, canRead: true },
  ])
  @Get("/")
  public async get(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { session } = res.locals;
      const {
        pageSize,
        pageIndex,
        search,
        isFilter,
        sortBy = "orderNumber",
        orderBy = "asc",
      } = req.query;

      const canViewSalary: Boolean = checkPermission(
        {
          permission: UserPermission.POSITION_MANAGEMENT,
          canViewSalary: true,
        },
        session.permissions
      );

      const positionRepository = dataSource.getRepository(Position);

      const [parentPositions, count] = await positionRepository.findAndCount({
        where: {
          parentId: IsNull(),
          name: search ? ILike(`%${search}%`) : undefined,
        },
        order: {
          [sortBy as string]: orderBy,
        },
        skip:
          pageIndex && pageSize
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined,
        take: pageIndex && pageSize ? Number(pageSize) : undefined,
      });

      const subPositions = await Promise.all(
        parentPositions.map((position: Position) =>
          positionRepository.find({
            where: {
              parentId: position.id,
            },
            order: {
              orderNumber: "ASC",
            },
            select: ["id", "level", "orderNumber", "parentId", "salary"],
          })
        )
      );

      //Format Result
      const positions = parentPositions.map(
        (position: Position, index: number) => {
          if (isFilter) {
            const parentPositionName = position.name;
            const formatSubPosition = subPositions[index].map(
              (subPosition: Position) => {
                return {
                  ...omit(subPosition, ["level", "salary"]),
                  name: subPosition.level + " " + parentPositionName,
                  ...(canViewSalary && {
                    salary:
                      subPosition.salary && decryptSalary(subPosition.salary),
                  }),
                };
              }
            );
            return {
              ...omit(position, ["salary"]),
              ...(canViewSalary && {
                salary: position.salary && decryptSalary(position.salary),
              }),
              levels: formatSubPosition,
            };
          }
          return {
            ...omit(position, ["salary"]),
            ...(canViewSalary && {
              salary: position.salary && decryptSalary(position.salary),
            }),
            levels: subPositions[index].map((subPosition: Position) => ({
              ...omit(subPosition, ["salary"]),
              ...(canViewSalary && {
                salary: subPosition.salary && decryptSalary(subPosition.salary),
              }),
            })),
          };
        }
      );

      if (isFilter) {
        res.locals.data = {
          pageSize: Number(pageSize),
          pageIndex: Number(pageIndex),
          count: await positionRepository.count({
            where: {
              parentId: Not(IsNull()),
              name: search ? ILike(`%${search}%`) : undefined,
            },
          }),
          position_levels: positions
            .map((position: any) => {
              return position.levels;
            })
            .flat(),
        };
      } else {
        res.locals.data = {
          pageSize: Number(pageSize),
          pageIndex: Number(pageIndex),
          count,
          positions,
        };
      }

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.POSITION_MANAGEMENT, canCreate: true },
  ])
  @Post("/")
  public async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { name, orderNumber = 0, salary, levels } = req.body;
      const { dataSource } = req.app.locals;
      const { session } = res.locals;

      const canEditSalary: Boolean = checkPermission(
        { permission: UserPermission.POSITION_MANAGEMENT, canEditSalary: true },
        session.permissions
      );

      const positionRepository = dataSource.getRepository(Position);

      const positionNameExist: Position | null =
        await positionRepository.findOneBy({ name });
      if (positionNameExist) {
        throw new NotAcceptableError("Position name already exists");
      }

      const parentPosition: Position = positionRepository.create({
        name,
        orderNumber,
        ...(canEditSalary && {
          salary:
            salary !== null && salary !== undefined
              ? encryptSalary(salary)
              : undefined,
        }),
      });
      await positionRepository.save(parentPosition);

      const childrenPosition: Position[] = levels.map(
        (level: { name: string; salary: number }, index: number): Position => {
          return positionRepository.create({
            name,
            level: level.name,
            orderNumber: index,
            ...(canEditSalary && {
              salary:
                level.salary !== null && level.salary !== undefined
                  ? encryptSalary(level.salary)
                  : undefined,
            }),
            parentId: parentPosition.id,
          });
        }
      );
      await positionRepository.save(childrenPosition);

      res.locals.message = "Position created successfully";
      res.locals.data = {
        position: {
          ...omit(parentPosition, ["salary"]),
          ...(canEditSalary && {
            salary:
              parentPosition.salary && decryptSalary(parentPosition.salary),
          }),
          levels: childrenPosition.map((childPosition: Position) => ({
            ...omit(childPosition, ["salary"]),
            ...(canEditSalary && {
              salary:
                childPosition.salary && decryptSalary(childPosition.salary),
            }),
          })),
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.POSITION_MANAGEMENT, canUpdate: true },
  ])
  @Put("/:id")
  public async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { name, orderNumber, salary, levels } = req.body;
      const { dataSource } = req.app.locals;
      const { session } = res.locals;

      const canEditSalary: Boolean = checkPermission(
        {
          permission: UserPermission.POSITION_MANAGEMENT,
          canEditSalary: true,
        },
        session.permissions
      );

      const positionRepository = dataSource.getRepository(Position);
      const employeeRepository = dataSource.getRepository(Employee);

      const positionNameExist: Position | null =
        await positionRepository.findOne({
          where: { id: Not(id), name, parentId: IsNull() },
        });
      if (positionNameExist) {
        throw new NotAcceptableError("Position name already exists");
      }

      const parentPosition: Position | null =
        await positionRepository.findOneBy({
          id,
        });
      if (!parentPosition) {
        throw new NotFoundError("Position is not found");
      }

      const levelsIdNotNull = levels.filter(
        (level: {
          id: string | null;
          name: string;
          salary: number | string | null;
        }) => level.id
      );

      const levelsIdNull = levels.filter(
        (level: {
          id: string | null;
          name: string;
          salary: number | string | null;
        }) => !level.id
      );

      const childrenPosition: Position[] = await positionRepository.find({
        where: {
          parentId: id,
        },
      });

      const levelsForUpdate: Position[] = childrenPosition.filter(
        (childPosition: Position) =>
          levelsIdNotNull.find(
            (level: {
              id: string;
              name: string;
              salary: number | string | null;
            }) => level.id === childPosition.id
          )
      );

      if (levelsForUpdate.length !== levelsIdNotNull.length) {
        throw new NotAcceptableError("Some levels are not found.");
      }

      const updateChildrenPosition: Position[] = levelsForUpdate.map(
        (item: Position) => {
          const level = levels.find(
            (level: {
              id: string;
              name: string;
              salary: number | string | null;
            }) => level.id === item.id
          );

          return positionRepository.merge(item, {
            name,
            level: level.name,
            orderNumber: levels.indexOf(level),
            ...(canEditSalary && {
              salary:
                level.salary !== null && level.salary !== undefined
                  ? encryptSalary(Number(level.salary))
                  : undefined,
            }),
            parentId: id,
          });
        }
      );

      const newChildrenPosition: Position[] = levelsIdNull.map(
        (level: { id: null; name: string; salary: number | string | null }) => {
          return positionRepository.create({
            name,
            level: level.name,
            orderNumber: levels.indexOf(level),
            ...(canEditSalary && {
              salary:
                level.salary !== null && level.salary !== undefined
                  ? encryptSalary(Number(level.salary))
                  : undefined,
            }),
            parentId: id,
          });
        }
      );

      const deleteChildrenPosition: Position[] = childrenPosition.filter(
        (childPosition: Position) => {
          return !levels.find(
            (level: {
              id: string | null;
              name: string;
              salary: number | string | null;
            }) => level.id === childPosition.id
          );
        }
      );

      const deleteChildrenPositionIds: string[] = deleteChildrenPosition.map(
        (childPosition: Position) => childPosition.id
      );
      const deleteChildrenPositionLevels: string[] = deleteChildrenPosition.map(
        (childPosition: Position) => childPosition.level
      );

      if (deleteChildrenPositionIds.length > 0) {
        const employees: Employee[] = await employeeRepository.find({
          where: {
            position: {
              id: In(deleteChildrenPositionIds),
            },
          },
          withDeleted: true,
        });
        if (employees.length > 0) {
          throw new NotAcceptableError(
            `Level: ${deleteChildrenPositionLevels.join(
              ", "
            )} cannot be deleted because it is being used by employees.`
          );
        }
      }

      positionRepository.merge(parentPosition, {
        name,
        orderNumber,
        ...(canEditSalary && {
          salary:
            salary !== null && salary !== undefined
              ? encryptSalary(salary)
              : undefined,
        }),
      });

      await Promise.all([
        positionRepository.save(parentPosition),
        positionRepository.save(updateChildrenPosition),
        positionRepository.remove(deleteChildrenPosition),
        positionRepository.save(newChildrenPosition),
      ]);

      const childrenPositionAfterUpdate: Position[] =
        await positionRepository.find({
          where: { parentId: id },
          order: { orderNumber: "ASC" },
        });

      res.locals.data = {
        position: {
          ...omit(parentPosition, ["salary"]),
          salary: parentPosition.salary && decryptSalary(parentPosition.salary),
          levels: childrenPositionAfterUpdate.map(
            (childPosition: Position) => ({
              ...omit(childPosition, ["salary"]),
              salary:
                childPosition.salary && decryptSalary(childPosition.salary),
            })
          ),
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id/permanently")
  @Authorize([
    {
      permission: UserPermission.POSITION_MANAGEMENT,
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

      const positionRepository = dataSource.getRepository(Position);
      const employeeRepository = dataSource.getRepository(Employee);

      const position: Position | null = await positionRepository.findOneBy({
        id,
      });
      if (!position) {
        throw new NotFoundError("Position is not found.");
      }

      const levels: Position[] = await positionRepository.find({
        where: {
          parentId: id,
        },
      });

      const positionIds = [position, ...levels].map(
        (position: Position) => position.id
      );

      const employees: Employee[] = await employeeRepository.find({
        where: {
          position: {
            id: In(positionIds),
          },
        },
        withDeleted: true,
      });
      if (employees.length > 0) {
        throw new NotAcceptableError(
          "Position cannot be deleted because it is being used by employees."
        );
      }

      await positionRepository.remove([position, ...levels]);

      res.locals.message = "Position successfully deleted permanently.";

      next();
    } catch (error) {
      next(error);
    }
  }

  @Get("/:id")
  @Authorize([
    { permission: UserPermission.POSITION_MANAGEMENT, canRead: true },
  ])
  public async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;
      const { session } = res.locals;

      const canViewSalary: Boolean = checkPermission(
        { permission: UserPermission.POSITION_MANAGEMENT, canViewSalary: true },
        session.permissions
      );

      const positionRepository = dataSource.getRepository(Position);

      const position = await positionRepository.findOneBy({ id });
      if (!position) {
        throw new NotFoundError("Position is not found.");
      }

      const subPositions = await positionRepository.find({
        where: {
          parentId: position.id,
        },
        order: {
          orderNumber: "ASC",
        },
        select: ["id", "level", "orderNumber", "parentId", "salary"],
      });

      res.locals.data = {
        position: {
          ...omit(position, ["salary"]),
          ...(canViewSalary && {
            salary: position.salary && decryptSalary(position.salary),
          }),
          levels: subPositions.map((subPosition: Position) => ({
            ...omit(subPosition, ["salary"]),
            ...(canViewSalary && {
              salary: subPosition.salary && decryptSalary(subPosition.salary),
            }),
          })),
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }
}

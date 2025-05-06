import { NextFunction, Request, Response } from "express";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import Controller from "../decorators/controller";
import { Delete, Get, Post, Put } from "../decorators/handlers";
import { Role } from "../database/entities/Role";
import { ForbiddenError, NotFoundError } from "../utils/errors";
import { Permission } from "../database/entities/Permission";
import { IUserPermission } from "../utils/interfaces";
import { getRolesAndPermissionsByUser } from "../database/repositories/auth.repository";
import { SystemPermission, UserPermission } from "../utils/permission";
import { FindManyOptions, In, IsNull, Not } from "typeorm";
import { User } from "../database/entities/User";

@Controller("/roles")
@Authenticate()
export default class RoleController {
  @Get("/system-permissions")
  @Authorize([
    { permission: UserPermission.ROLE_MANAGEMENT, canSetPermission: true },
  ])
  public async getPermissions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      res.locals.data = { systemPermissions: SystemPermission };
      next();
    } catch (error) {
      next(error);
    }
  }

  @Get("/")
  @Authorize([{ permission: UserPermission.ROLE_MANAGEMENT, canRead: true }])
  public async index(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        pageSize,
        pageIndex,
        status,
        sortBy = "name",
        orderBy = "asc",
      } = req.query;
      const { dataSource } = req.app.locals;
      const roleRepository = dataSource.getRepository(Role);
      const userRepository = dataSource.getRepository(User);

      let criteria: FindManyOptions<Role> = {
        skip:
          pageSize && pageIndex
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined,
        take: pageSize && pageIndex ? Number(pageSize) : undefined,
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

      if (status === "TRASH") {
        criteria = {
          ...criteria,
          withDeleted: true,
          where: {
            ...criteria.where,
            deletedAt: Not(IsNull()),
          },
        };
      }

      const [roles, count] = await roleRepository.findAndCount(criteria);

      const rolesWithTotalUser = await Promise.all(
        roles.map(async (role: Role) => {
          return {
            ...role,
            totalUser: await userRepository.count({
              relations: ["roles"],
              where: { roles: { id: role.id } },
            }),
          };
        })
      );

      res.locals.data = {
        roles: rolesWithTotalUser,
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Get("/count-all-status")
  @Authorize([{ permission: UserPermission.ROLE_MANAGEMENT, canRead: true }])
  public async countAllStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const userRepository = dataSource.getRepository(Role);

      const [totalActive, totalDeleted] = await Promise.all([
        userRepository.count(),
        userRepository.count({
          where: { deletedAt: Not(IsNull()) },
          withDeleted: true,
        }),
      ]);
      res.locals.data = {
        total: totalActive,
        totalActive,
        totalDeleted,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/")
  @Authorize([{ permission: UserPermission.ROLE_MANAGEMENT, canCreate: true }])
  public async add(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { session } = res.locals;
      const { name, description } = req.body;
      const roleRepository = dataSource.getRepository(Role);

      const role = roleRepository.create({
        name,
        description,
        createdBy: session.userId,
      });
      await roleRepository.save(role);

      res.locals.data = {
        role,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id")
  @Authorize([
    {
      permission: UserPermission.ROLE_MANAGEMENT,
      canUpdate: true,
    },
  ])
  public async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const { dataSource } = req.app.locals;
      const roleRepository = dataSource.getRepository(Role);

      const role = await roleRepository.findOne({
        where: { id },
        relations: ["permissions"],
      });

      if (!role) {
        throw new NotFoundError("Role is not found.");
      }

      if (role.createdBy === "migration" && name !== role.name) {
        throw new ForbiddenError("Can not edit name of this Role.");
      }

      roleRepository.merge(role, { name, description });

      await roleRepository.save(role);

      res.locals.data = {
        role,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Get("/:id")
  @Authorize([{ permission: UserPermission.ROLE_MANAGEMENT, canRead: true }])
  public async findById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;
      const roleRepository = dataSource.getRepository(Role);

      const role = await roleRepository.findOne({
        relations: ["permissions"],
        where: { id },
      });

      if (!role) {
        throw new NotFoundError("Role is not found.");
      }

      res.locals.data = {
        role: role,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id")
  @Authorize([{ permission: UserPermission.ROLE_MANAGEMENT, canDelete: true }])
  public async delete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;
      const roleRepository = dataSource.getRepository(Role);

      const role = await roleRepository.findOneBy({ id });

      if (!role) {
        throw new NotFoundError("Role is not found.");
      }

      if (role.createdBy === "migration") {
        throw new ForbiddenError("Can not delete this Role.");
      }

      await roleRepository.softDelete({ id });

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/")
  @Authorize([{ permission: UserPermission.ROLE_MANAGEMENT, canDelete: true }])
  public async deleteMultiple(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const listId = req.body;

      const { dataSource } = req.app.locals;
      const roleRepository = dataSource.getRepository(Role);

      await Promise.all(
        listId.map(async (id: string) => {
          const role = await roleRepository.findOneBy({ id });

          if (!role) {
            throw new NotFoundError("Role is not found.");
          }

          if (role.createdBy === "migration") {
            throw new ForbiddenError("Can not delete this Role.");
          }
        })
      );

      await roleRepository.softDelete({ id: In(listId) });

      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/:id/set-permissions")
  @Authorize([
    { permission: UserPermission.ROLE_MANAGEMENT, canSetPermission: true },
  ])
  public async setPermissions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { permissions } = req.body;
      const { dataSource } = req.app.locals;
      const { session } = res.locals;

      const roleRepository = dataSource.getRepository(Role);
      const permissionRepository = dataSource.getRepository(Permission);
      const role = await roleRepository.findOneBy({ id });

      if (!role) {
        throw new NotFoundError("Role is not found.");
      }

      const permissionUpdated = await Promise.all(
        permissions.map(async (permRequest: IUserPermission) => {
          const permEdit = await permissionRepository.findOneBy({
            role: { id },
            name: permRequest.permission,
          });
          if (permEdit) {
            if (permEdit.createdBy !== "migration") {
              permissionRepository.merge(permEdit, permRequest);
            }
            return await permissionRepository.save(permEdit);
          } else {
            const permNew = permissionRepository.create({
              ...permRequest,
              name: permRequest.permission,
              role,
              createdBy: session.userId,
            });
            return await permissionRepository.save(permNew);
          }
        })
      );

      res.locals.data = {
        role: { ...role, permissions: permissionUpdated },
      };

      const allRoleAndPermission = await getRolesAndPermissionsByUser({
        dataSource,
        userId: session.userId,
      });
      res.locals.session = {
        ...session,
        ...allRoleAndPermission,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id/permanently")
  @Authorize([
    {
      permission: UserPermission.ROLE_MANAGEMENT,
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

      const roleRepository = dataSource.getRepository(Role);
      const permissionRepository = dataSource.getRepository(Permission);

      const role: Role | null = await roleRepository
        .createQueryBuilder("role")
        .withDeleted()
        .where("role.id = :id", { id })
        .andWhere("role.deletedAt IS NOT NULL")
        .getOne();

      if (!role) {
        throw new NotFoundError("Role is not found.");
      }

      const permissions: Permission[] = await permissionRepository
        .createQueryBuilder("permission")
        .withDeleted()
        .where('"roleId" = :id', { id })
        .getMany();
      await permissionRepository.remove(permissions);
      await roleRepository.remove(role);

      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id/restore")
  @Authorize([{ permission: UserPermission.ROLE_MANAGEMENT, canRestore: true }])
  public async restore(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;

      const roleRepository = dataSource.getRepository(Role);

      const role: Role | null = await roleRepository
        .createQueryBuilder("role")
        .withDeleted()
        .where("role.id = :id", { id })
        .andWhere("role.deletedAt IS NOT NULL")
        .getOne();

      if (!role) {
        throw new NotFoundError("Role is not found.");
      }

      await roleRepository.restore(role.id);

      next();
    } catch (error) {
      next(error);
    }
  }
}

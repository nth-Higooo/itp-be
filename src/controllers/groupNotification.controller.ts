import { NextFunction, Request, Response } from "express";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import Controller from "../decorators/controller";
import { Delete, Get, Post, Put } from "../decorators/handlers";
import { UserPermission } from "../utils/permission";
import { Employee } from "../database/entities/Employee";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { In } from "typeorm";
import {
  GroupNotification,
  GroupNotificationType,
} from "../database/entities/GroupNotification";
import { omit } from "../utils";
@Controller("/group-notifications")
@Authenticate()
export default class GroupNotificationController {
  @Get("/")
  @Authorize([
    { permission: UserPermission.GROUP_NOTIFICATION_MANAGEMENT, canRead: true },
  ])
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
        memberName,
        type,
        sortBy = "updatedAt",
        orderBy = "desc",
      } = req.query;

      const groupNotificationRepository =
        dataSource.getRepository(GroupNotification);

      const [groupNotifications, count] = await groupNotificationRepository
        .createQueryBuilder("group_notifications")
        .leftJoinAndSelect("group_notifications.members", "employees")
        .where(type ? "group_notifications.type = :type" : "1=1", {
          type,
        })
        .where(memberName ? "employees.fullName ILIKE :memberName" : "1=1", {
          memberName: `%${memberName}%`,
        })
        .orderBy(
          `group_notifications.${sortBy}`,
          orderBy === "desc" ? "DESC" : "ASC"
        )
        .skip(
          pageIndex && pageSize
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined
        )
        .take(pageIndex && pageSize ? Number(pageSize) : undefined)
        .select(["group_notifications", "employees.id", "employees.fullName"])
        .getManyAndCount();

      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count,
        groupNotifications,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/")
  @Authorize([
    {
      permission: UserPermission.GROUP_NOTIFICATION_MANAGEMENT,
      canCreate: true,
    },
  ])
  public async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { session } = res.locals;
      const { type, members } = req.body;

      const groupNotificationRepository =
        dataSource.getRepository(GroupNotification);
      const employeeRepository = dataSource.getRepository(Employee);

      if (
        type === GroupNotificationType.BIRTHDAY ||
        type === GroupNotificationType.EMPLOYEE_CHANGE_REQUEST ||
        type === GroupNotificationType.CONTRACT
      ) {
        const groupNotificationExist =
          await groupNotificationRepository.findOne({
            where: { type },
          });

        if (groupNotificationExist) {
          throw new BadRequestError(
            `Group notification ${type} already exists. Please try again.`
          );
        }
      }

      const owner: Employee | null = await employeeRepository
        .createQueryBuilder("employee")
        .where("employee.id = :employeeId", { employeeId: session.employeeId })
        .getOne();
      if (!owner) {
        throw new NotFoundError("Your employee information is not found.");
      }

      let employees: Employee[] = [];
      if (members) {
        employees = await employeeRepository.find({
          where: { id: In(members) },
        });
        if (employees.length !== members.length) {
          throw new NotFoundError(
            "Some employee are not found. Please try again."
          );
        }
      }

      const groupNotification: GroupNotification =
        groupNotificationRepository.create({
          type,
          members: employees,
          createdBy: session.userId,
        });
      await groupNotificationRepository.save(groupNotification);

      res.locals.message = "Create group notification successfully.";
      res.locals.data = {
        groupNotification: {
          ...omit(groupNotification, ["members"]),
          members: employees.map((employee: Employee) => ({
            id: employee.id,
            fullName: employee.fullName,
          })),
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id")
  @Authorize([
    {
      permission: UserPermission.GROUP_NOTIFICATION_MANAGEMENT,
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
      const { session } = res.locals;
      const { members } = req.body;
      const { dataSource } = req.app.locals;

      const groupNotificationRepository =
        dataSource.getRepository(GroupNotification);
      const employeeRepository = dataSource.getRepository(Employee);

      const groupNotification: GroupNotification | null =
        await groupNotificationRepository
          .createQueryBuilder("group_notifications")
          .leftJoinAndSelect("group_notifications.members", "employees")
          .where("group_notifications.id = :id", { id })
          .select(["group_notifications", "employees.id", "employees.fullName"])
          .getOne();
      if (!groupNotification) {
        throw new NotFoundError("Group notification is not found.");
      }

      let employees: Employee[] = [];
      if (members) {
        employees = await employeeRepository.find({
          where: { id: In(members) },
        });
        if (employees.length !== members.length) {
          throw new NotFoundError(
            "Some employee is not found. Please try again."
          );
        }
      }

      const owner: Employee | null = await employeeRepository
        .createQueryBuilder("employee")
        .where("employee.id = :employeeId", { employeeId: session.employeeId })
        .getOne();
      if (!owner) {
        throw new NotFoundError("Your employee information is not found.");
      }

      groupNotification.members = [...employees];

      await groupNotificationRepository.save(groupNotification);

      res.locals.message = "Update group notification successfully.";
      res.locals.data = {
        groupNotification: {
          ...omit(groupNotification, ["members"]),
          members: employees.map((employee: Employee) => ({
            id: employee.id,
            fullName: employee.fullName,
          })),
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

      const groupNotificationRepository =
        dataSource.getRepository(GroupNotification);

      const groupNotification: GroupNotification | null =
        await groupNotificationRepository
          .createQueryBuilder("group_notifications")
          .where("group_notifications.id = :id", { id })
          .select(["group_notifications"])
          .getOne();
      if (!groupNotification) {
        throw new NotFoundError("Group notification is not found.");
      }

      if (
        groupNotification.type === GroupNotificationType.BIRTHDAY ||
        groupNotification.type === GroupNotificationType.CONTRACT
      ) {
        throw new BadRequestError("You can't delete this group notification.");
      }

      await groupNotificationRepository.remove(groupNotification);

      res.locals.message = "Group notification was deleted successfully.";

      next();
    } catch (error) {
      next(error);
    }
  }
}

import { NextFunction, Request, Response } from "express";
import Authenticate from "../decorators/authenticate";
import Controller from "../decorators/controller";
import { Get, Post } from "../decorators/handlers";
import { FindManyOptions, In } from "typeorm";
import { Notification } from "../database/entities/Notification";
import { BadRequestError } from "../utils/errors";

@Controller("/notifications")
@Authenticate()
export default class NotificationController {
  @Get("/")
  public async index(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { userId } = req.query;

      const notificationRepository = dataSource.getRepository(Notification);

      if (!userId) {
        throw new BadRequestError("User is not found.");
      }

      let criteria: FindManyOptions<Notification> = {
        relations: {
          assignee: true,
        },
        where: {
          assignee: { id: userId as string },
        },
        order: {
          createdAt: "DESC",
        },
      };

      const [notifications, count] = await notificationRepository.findAndCount(
        criteria
      );

      res.locals.data = {
        count,
        notifications: notifications.map((notification: Notification) => {
          return {
            ...notification,
            assignee: {
              avatar: notification.assignee.avatar,
              displayName: notification.assignee.displayName,
            },
          };
        }),
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/read")
  public async read(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { notifications, isRead } = req.body;

      const notificationRepository = dataSource.getRepository(Notification);

      await notificationRepository
        .createQueryBuilder()
        .update(Notification)
        .set({ isRead })
        .where({ id: In(notifications.map((item: Notification) => item.id)) })
        .execute();

      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/delete")
  public async delete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { notifications } = req.body;

      const notificationRepository = dataSource.getRepository(Notification);

      await notificationRepository
        .createQueryBuilder()
        .delete()
        .from(Notification)
        .where({ id: In(notifications.map((item: Notification) => item.id)) })
        .execute();

      next();
    } catch (error) {
      next(error);
    }
  }
}

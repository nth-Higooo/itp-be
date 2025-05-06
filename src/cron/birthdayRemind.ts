import application from "../application";
import { calculateDistanceInDays } from "../utils";
import { createNotification } from "../database/repositories/notification.repository";
import { NotificationContentType } from "../utils/enums";
import { User, UserStatus } from "../database/entities/User";
import {
  GroupNotification,
  GroupNotificationType,
} from "../database/entities/GroupNotification";

export const birthdayRemind = async () => {
  const userRepository =
    application.instance.locals.dataSource.getRepository(User);
  const groupNotificationRepository =
    application.instance.locals.dataSource.getRepository(GroupNotification);

  const groupBirthdays: GroupNotification[] =
    await groupNotificationRepository.find({
      relations: ["members", "members.user"],
      where: {
        type: GroupNotificationType.BIRTHDAY,
      },
    });

  if (groupBirthdays.length > 0) {
    const userIds = groupBirthdays.flatMap((group: GroupNotification) =>
      group.members.map((member) => member.user.id)
    );

    let users = await userRepository
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.employee", "employee")
      .where("user.status = :status", { status: UserStatus.ACTIVE })
      .andWhere("employee.dateOfBirth IS NOT NULL")
      .getMany();

    if (users) {
      users = users.filter((user: User) => {
        const newDate = new Date();
        // Extract the month and day from both dates
        const month1 = newDate.getMonth();
        const day1 = newDate.getDate();
        const month2 = user.employee.dateOfBirth!.getMonth();
        const day2 = user.employee.dateOfBirth!.getDate();
        // Create new Date objects for comparison
        const newDate1 = new Date(2000, month1, day1);
        const newDate2 = new Date(2000, month2, day2);

        const days = calculateDistanceInDays(newDate1, newDate2);
        return days <= 1;
      });

      Promise.all(
        users.map((user: User) => {
          const urlEmployee = `/employees/${user.employee.id}`;
          const newDate = new Date();
          newDate.setMonth(user.employee.dateOfBirth!.getMonth());
          newDate.setDate(user.employee.dateOfBirth!.getDate());

          userIds.map(async (id: string) => {
            return createNotification({
              assignee: id,
              content: `${
                user.employee.fullName
              } has an birthday in ${newDate?.toLocaleDateString("en-GB", {
                month: "2-digit",
                day: "2-digit",
                weekday: "long",
              })}`,
              createdBy: "system",
              dataSource: application.instance.locals.dataSource,
              socket: application.instance.locals.socket,
              contentType: NotificationContentType.MAIL,
              actions: urlEmployee,
            });
          });
        })
      );
    }
  }
};

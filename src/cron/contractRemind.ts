import application from "../application";
import { createNotification } from "../database/repositories/notification.repository";
import { calculateDistanceInDays } from "../utils";
import { NotificationContentType } from "../utils/enums";
import {
  Contract,
  ContractStatus,
  ContractTypes,
} from "../database/entities/Contract";
import { Not } from "typeorm";
import {
  GroupNotification,
  GroupNotificationType,
} from "../database/entities/GroupNotification";

export const contractRemind = async () => {
  const contractRepository =
    application.instance.locals.dataSource.getRepository(Contract);
  const groupNotificationRepository =
    application.instance.locals.dataSource.getRepository(GroupNotification);

  const groupContracts: GroupNotification[] =
    await groupNotificationRepository.find({
      relations: ["members", "members.user"],
      where: {
        type: GroupNotificationType.CONTRACT,
      },
    });

  if (groupContracts.length > 0) {
    const userIds = groupContracts.flatMap((group: GroupNotification) =>
      group.members.map((member) => member.user.id)
    );

    let nearExpirationContract = await contractRepository.find({
      relations: ["employee", "employee.user"],
      where: {
        status: ContractStatus.ACTIVE,
        contractType: Not(ContractTypes.OFFICIAL_INDEFINITELY),
      },
    });

    if (nearExpirationContract) {
      const otherContracts = nearExpirationContract.filter(
        (contract: Contract) => {
          const days = calculateDistanceInDays(
            new Date(),
            new Date(contract.endDate)
          );
          return (
            days >= 0 &&
            days <= 30 &&
            contract.contractType !== ContractTypes.PROBATION
          );
        }
      );

      const probationContracts = nearExpirationContract.filter(
        (contract: Contract) => {
          const days = calculateDistanceInDays(
            new Date(),
            new Date(contract.endDate)
          );
          return (
            days >= 0 &&
            days <= 20 &&
            contract.contractType === ContractTypes.PROBATION
          );
        }
      );

      Promise.all([
        otherContracts.map(async (contract: Contract) => {
          const urlEmployeeContract = `/employees/${contract.employee.id}`;

          userIds.map(async (id: string) => {
            return await createNotification({
              assignee: id,
              content: `${
                contract.employee.fullName
              } has an contract near expiration date ${new Date(
                contract.endDate
              ).toLocaleString("en-GB", {
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
              })}. Please check it out!`,
              createdBy: "system",
              dataSource: application.instance.locals.dataSource,
              socket: application.instance.locals.socket,
              contentType: NotificationContentType.MAIL,
              actions: urlEmployeeContract,
            });
          });
        }),
        probationContracts.map(async (contract: Contract) => {
          const urlEmployeeContract = `/employees/${contract.employee.id}`;

          userIds.map(async (id: string) => {
            return await createNotification({
              assignee: id,
              content: `${
                contract.employee.fullName
              } has an contract near expiration date ${new Date(
                contract.endDate
              ).toLocaleString("en-GB", {
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
              })}. Please check it out!`,
              createdBy: "system",
              dataSource: application.instance.locals.dataSource,
              socket: application.instance.locals.socket,
              contentType: NotificationContentType.MAIL,
              actions: urlEmployeeContract,
            });
          });
        }),
      ]);
    }
  }
};

import { IsNull, MoreThan } from "typeorm";
import application from "../application";
import { ContractStatus, ContractTypes } from "../database/entities/Contract";
import {
  RemainingAnnualLeave,
  RemainingAnnualLeaveStatus,
} from "../database/entities/RemainingAnnualLeave";

export const remainingAnnual = async () => {
  const remainingAnnualLeaveRepository =
    application.instance.locals.dataSource.getRepository(RemainingAnnualLeave);

  const today = new Date();

  const remainingAnnualLeaves: RemainingAnnualLeave[] =
    await remainingAnnualLeaveRepository.find({
      relations: ["employee", "employee.contracts"],
      where: {
        year: today.getFullYear().toString(),
        employee: [
          {
            contracts: {
              status: ContractStatus.ACTIVE,
            },
            resignDate: MoreThan(new Date()),
          },
          {
            contracts: {
              status: ContractStatus.ACTIVE,
            },
            resignDate: IsNull(),
          },
        ],
      },
    });

  if (remainingAnnualLeaves.length > 0) {
    const update = remainingAnnualLeaves.map(
      async (remainingAnnualLeave: RemainingAnnualLeave) => {
        let temp = remainingAnnualLeave;

        if (
          temp.employee.contracts[0].contractType !== ContractTypes.PROBATION &&
          temp.status === RemainingAnnualLeaveStatus.DISABLED
        ) {
          temp.status = RemainingAnnualLeaveStatus.ACTIVE;
        }

        if (temp.employee.joinDate && !temp.calculationDate) {
          temp.calculationDate = temp.employee.joinDate;
        }

        if (temp.calculationDate) {
          const diffTime = Math.abs(
            today.getTime() - new Date(temp.calculationDate).getTime()
          );

          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays >= 30) {
            temp.quantity += 1;
            temp.calculationDate = today;
          } else if (today.getMonth() === 0) {
            const previous: RemainingAnnualLeave | null =
              await remainingAnnualLeaveRepository.findOne({
                where: {
                  employee: {
                    id: remainingAnnualLeave.employee.id,
                  },
                  year: (today.getFullYear() - 1).toString(),
                },
              });

            if (previous && previous.calculationDate) {
              const diffTime = Math.abs(
                today.getTime() - new Date(previous.calculationDate).getTime()
              );
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays >= 30) {
                previous.quantity += 1;
                previous.calculationDate = today;
                temp = previous;
              }
            }
          }
        }

        return temp;
      }
    );

    await remainingAnnualLeaveRepository.save(await Promise.all(update));

    if (today.getMonth() === 11 && today.getDate() === 31) {
      remainingAnnualLeaves.map((item: RemainingAnnualLeave) => {
        if (item.employee.contracts[0].endDate.getTime() > today.getTime()) {
          remainingAnnualLeaveRepository.create({
            quantity: 0,
            status: item.status,
            calculationDate: item.calculationDate?.setMonth(
              item.calculationDate.getMonth() + 1
            ),
            year: (today.getFullYear() + 1).toString(),
            employee: item.employee,
            leaveType: item.leaveType,
          });
        }
      });
    }
  }
};

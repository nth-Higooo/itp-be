import { Column, Entity, OneToMany } from "typeorm";
import { AppBaseEntity } from "./AppBase";
import { LeaveRequest } from "./LeaveRequest";
import { RemainingAnnualLeave } from "./RemainingAnnualLeave";

@Entity("leave_types")
export class LeaveType extends AppBaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  regulationQuantity?: number;

  @Column()
  orderNumber: number;

  @OneToMany(() => LeaveRequest, (leaveRequest) => leaveRequest.leaveType)
  leaveRequests: LeaveRequest[];

  @OneToMany(
    () => RemainingAnnualLeave,
    (remainingAnnualLeave) => remainingAnnualLeave.leaveType
  )
  remainingAnnualLeaves: RemainingAnnualLeave[];
}

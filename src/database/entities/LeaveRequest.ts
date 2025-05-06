import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { AppBaseEntity } from "./AppBase";
import { LeaveType } from "./LeaveType";
import { Employee } from "./Employee";

export enum LeaveRequestStatus {
  PENDING = "Pending",
  REJECTED = "Rejected",
  APPROVED = "Approved",
}
export enum LeavePeriod {
  MORNING = "Morning",
  AFTERNOON = "Afternoon",
  FULL_DAY = "Full_Day",
}

@Entity("leave_requests")
export class LeaveRequest extends AppBaseEntity {
  @ManyToOne(() => LeaveType, (leaveType) => leaveType.leaveRequests, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "leaveTypeId", referencedColumnName: "id" })
  leaveType: LeaveType;

  @ManyToOne(() => Employee, (employee) => employee.leaveRequestsApproval)
  @JoinColumn({ name: "approverId", referencedColumnName: "id" })
  approver: Employee;

  @ManyToOne(() => Employee, (employee) => employee.leaveRequests, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "employeeId", referencedColumnName: "id" })
  employee: Employee;

  @Column({ type: "timestamp" })
  startDate: Date;

  @Column({ type: "timestamp" })
  endDate: Date;

  @Column({ type: "float" })
  numberOfDays: number;

  @Column()
  reason: string;

  @Column({ nullable: true })
  comment: string;

  @Column({
    type: "enum",
    enum: LeaveRequestStatus,
    default: LeaveRequestStatus.PENDING,
  })
  status: string;

  @Column({
    type: "enum",
    enum: LeavePeriod,
    nullable: true,
  })
  leavePeriod?: string;

  @Column({ default: false })
  isInformCustomer: boolean;
}

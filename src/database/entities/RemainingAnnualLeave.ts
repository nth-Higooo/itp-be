import {
  BaseEntity,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Employee } from "./Employee";
import { LeaveType } from "./LeaveType";

export enum RemainingAnnualLeaveStatus {
  ACTIVE = "ACTIVE",
  DISABLED = "DISABLED",
}

@Entity("remaining_annual_leaves")
export class RemainingAnnualLeave extends BaseEntity {
  @Index()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "float", default: 0 })
  quantity: number;

  @Column({
    type: "enum",
    enum: RemainingAnnualLeaveStatus,
    default: RemainingAnnualLeaveStatus.ACTIVE,
  })
  status: RemainingAnnualLeaveStatus;

  @Column({ type: "date", nullable: true })
  calculationDate?: Date;

  @Column()
  year: string;

  @ManyToOne(() => Employee, (employee) => employee.remainingAnnualLeaves, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "employeeId", referencedColumnName: "id" })
  employee: Employee;

  @ManyToOne(() => LeaveType, (leaveType) => leaveType.remainingAnnualLeaves, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "leaveTypeId", referencedColumnName: "id" })
  leaveType: LeaveType;
}

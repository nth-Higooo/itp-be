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

@Entity("employee_children")
export class EmployeeChildren extends BaseEntity {
  @Index()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  dob?: Date;

  @ManyToOne(() => Employee, (employee) => employee.children, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "employeeId", referencedColumnName: "id" })
  employee: Employee;
}

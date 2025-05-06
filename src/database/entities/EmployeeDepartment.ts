import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Employee } from "./Employee";
import { Department } from "./Department";

@Entity("employees_departments")
export class EmployeeDepartment {
  @Index()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Employee, (employee) => employee.departments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "employeeId", referencedColumnName: "id" })
  employee: Employee;

  @ManyToOne(() => Department, (department) => department.employees)
  @JoinColumn({ name: "departmentId", referencedColumnName: "id" })
  department: Department;

  @Column({ default: false })
  isManager: boolean;
}

import {
  BaseEntity,
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { EmployeeDepartment } from "./EmployeeDepartment";
import { Project } from "./Project";

export enum DepartmentType {
  Operation = "Operation",
  Delivery = "Delivery",
}

@Entity("departments")
export class Department extends BaseEntity {
  @Index()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column()
  orderNumber: number;

  @Column({ type: "uuid", nullable: true })
  parentId: string;

  @OneToMany(
    () => EmployeeDepartment,
    (employeeDepartment) => employeeDepartment.department
  )
  employees: EmployeeDepartment[];

  @OneToMany(() => Project, (project) => project.department)
  projects: Project[];

  @Column({ type: "enum", enum: DepartmentType })
  type: string;
}

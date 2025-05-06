import {
  BaseEntity,
  Column,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Employee } from "./Employee";
import { Project } from "./Project";

@Entity("projects_employees")
export class ProjectEmployee extends BaseEntity {
  @Index()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ default: false })
  isProjectManager: boolean;

  @Column({ default: 100 })
  spendTime: number;

  @ManyToOne(() => Project, (project) => project.projectEmployees)
  project: Project;

  @ManyToOne(() => Employee, (employee) => employee.projectEmployees)
  employee: Employee;
}

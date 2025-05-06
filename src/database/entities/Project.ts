import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { AppBaseEntity } from "./AppBase";
import { Department } from "./Department";
import { ProjectEmployee } from "./ProjectEmployee";
import { Employee } from "./Employee";
import { Market } from "./Market";

export enum ProjectStatus {
  INITIAL = "INITIAL",
  PLANNING = "PLANNING",
  EVALUATION = "EVALUATION",
  QUOTES = "QUOTES",
  SIGN_CONTRACT = "SIGN_CONTRACT",
  REJECT = "REJECT",
  KICK_OFF = "KICK_OFF",
  IN_PROGRESS = "IN_PROGRESS",
  ARCHIVE = "ARCHIVE",
}

export enum ProjectType {
  ODC = "ODC",
  PROJECT_BASED = "PROJECT_BASED",
  TIME_MATERIAL = "TIME_MATERIAL",
}

@Entity("projects")
export class Project extends AppBaseEntity {
  @Column()
  name: string;

  @Column({
    type: "enum",
    enum: ProjectType,
  })
  type: ProjectType;

  @Column()
  clientName: string;

  @ManyToOne(() => Employee, (employee) => employee.accountManagers)
  @JoinColumn({ name: "accountManagerId", referencedColumnName: "id" })
  accountManager?: Employee;

  @Column()
  business?: string;

  @ManyToOne(() => Employee, (employee) => employee.projectManagers)
  @JoinColumn({ name: "projectManagerId", referencedColumnName: "id" })
  projectManager?: Employee;

  @Column()
  technologies?: string;

  @Column({ type: "date" })
  startDate: Date;

  @Column({ type: "date" })
  endDate: Date;

  @Column()
  communicationChannels?: string;

  @Column()
  notes?: string;

  @Column({
    type: "enum",
    enum: ProjectStatus,
    default: ProjectStatus.INITIAL,
  })
  status: ProjectStatus;

  @ManyToOne(() => Department, (department) => department.projects)
  @JoinColumn({ name: "departmentId", referencedColumnName: "id" })
  department?: Department;

  @OneToMany(
    () => ProjectEmployee,
    (projectEmployee) => projectEmployee.project
  )
  projectEmployees: ProjectEmployee[];

  @ManyToOne(() => Market, (market) => market.projects, { onUpdate: "CASCADE" })
  @JoinColumn({ name: "marketId", referencedColumnName: "id" })
  market?: Market;
}

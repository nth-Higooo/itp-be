import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { Employee } from "./Employee";
import { AppBaseEntity } from "./AppBase";

export enum ContractTypes {
  OFFICIAL_1_YEAR = "Official (1 year)",
  OFFICIAL_2_YEARS = "Official (2 years)",
  OFFICIAL_3_YEARS = "Official (3 years)",
  OFFICIAL_INDEFINITELY = "Official (Indefinitely)",
  INTERNSHIP = "Intern",
  PROBATION = "Probation",
}

export enum WorkingTypes {
  FULL_TIME = "Fulltime",
  PART_TIME = "Parttime",
}
export enum ContractStatus {
  PENDING = "Pending",
  ACTIVE = "Active",
  TERMINATED = "Terminated",
  EXPIRED = "Expired",
}

@Entity("contracts")
export class Contract extends AppBaseEntity {
  @ManyToOne(() => Employee, (employee) => employee.contracts, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "employeeId", referencedColumnName: "id" })
  employee: Employee;

  @Column({ unique: true, nullable: true })
  no: string;

  @Column({ type: "enum", enum: ContractTypes })
  contractType: string;

  @Column({ type: "enum", enum: WorkingTypes })
  workingType: string;

  @Column({ type: "date" })
  startDate: Date;

  @Column({ type: "date", nullable: true })
  endDate: Date;

  @Column({ type: "enum", enum: ContractStatus })
  status: string;

  @Column({ default: false })
  isRemote: boolean;

  @Column({ nullable: true })
  file?: string;
}

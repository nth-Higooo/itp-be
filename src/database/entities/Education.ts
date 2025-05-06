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
import { Degree } from "./Degree";

@Entity("educations")
export class Education extends BaseEntity {
  @Index()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true })
  school?: string;

  @Column({ nullable: true })
  major?: string;

  @ManyToOne(() => Degree, (degree) => degree.educations, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "degreeId", referencedColumnName: "id" })
  degree?: Degree;

  @Column({ nullable: true })
  fromYear?: string;

  @Column({ nullable: true })
  toYear?: string;

  @Column({ nullable: true })
  certificateName?: string;

  @Column({ nullable: true })
  certificateWebsite: string;

  @ManyToOne(() => Employee, (employee) => employee.educations, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "employeeId", referencedColumnName: "id" })
  employee: Employee;
}

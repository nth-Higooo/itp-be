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
import { SkillLevel } from "./SkillLevel";

@Entity("skills")
export class Skill extends BaseEntity {
  @Index()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => SkillLevel, (skillLevel) => skillLevel.skills, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "skillLevelId", referencedColumnName: "id" })
  skillLevel: SkillLevel;

  @Column({ default: false })
  isMainSkill: boolean;

  @ManyToOne(() => Employee, (employee) => employee.skills, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "employeeId", referencedColumnName: "id" })
  employee: Employee;
}

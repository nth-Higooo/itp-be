import {
  BaseEntity,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { SkillType } from "./SkillType";
import { Skill } from "./Skill";

@Entity("skill_levels")
export class SkillLevel extends BaseEntity {
  @Index()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  orderNumber: number;

  @ManyToOne(() => SkillType, (skillType) => skillType.levels, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "skillTypeId", referencedColumnName: "id" })
  skillType: SkillType;

  @OneToMany(() => Skill, (skill) => skill.skillLevel)
  skills: Skill[];

  @Column()
  level: string;
}

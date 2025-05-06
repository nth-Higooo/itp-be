import {
  BaseEntity,
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { SkillLevel } from "./SkillLevel";

@Entity("skill_types")
export class SkillType extends BaseEntity {
  @Index()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  orderNumber: number;

  @Column()
  name: string;

  @Column({ type: "uuid", nullable: true })
  parentId: string;

  @Column({ nullable: true })
  skillName: string;

  @OneToMany(() => SkillLevel, (skillLevel) => skillLevel.skillType)
  levels: SkillLevel[];
}

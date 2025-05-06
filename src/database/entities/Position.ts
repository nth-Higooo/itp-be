import {
  BaseEntity,
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Employee } from "./Employee";

@Entity("positions")
export class Position extends BaseEntity {
  @Index()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  level: string;

  @OneToMany(() => Employee, (employee) => employee.position)
  employees: Employee[];

  @Column({ nullable: true })
  orderNumber: number;

  @Column({ nullable: true, type: "uuid" })
  parentId: string;

  @Column({ nullable: true })
  salary: string;
}

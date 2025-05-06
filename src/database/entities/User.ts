import {
  Column,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  Unique,
} from "typeorm";
import { Role } from "./Role";
import { Employee } from "./Employee";
import { AppBaseEntity } from "./AppBase";
import { Notification } from "./Notification";

export enum UserStatus {
  PENDING = "PENDING",
  ACTIVE = "ACTIVE",
  DISABLED = "DISABLED",
}

@Entity("users")
export class User extends AppBaseEntity {
  @Column()
  displayName: string;

  @Column({ nullable: true })
  avatar: string;

  @Index()
  @Column({ unique: true })
  email: string;

  @Column()
  hashPassword: string;

  @Column({
    type: "enum",
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: "users_roles",
    joinColumn: { name: "userId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "roleId" },
  })
  roles: Role[];

  @Column({ nullable: true })
  resetToken: string;

  @Column({ nullable: true })
  activeToken: string;

  @OneToOne(() => Employee, (employee) => employee.user)
  employee: Employee;

  @OneToMany(() => Notification, (notification) => notification.assignee)
  notifications: Notification[];
}

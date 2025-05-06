import { Column, Entity, ManyToMany, OneToMany } from "typeorm";
import { AppBaseEntity } from "./AppBase";
import { Employee } from "./Employee";

export enum GroupNotificationType {
  EMPLOYEE_CHANGE_REQUEST = "EMPLOYEE_CHANGE_REQUEST",
  CONTRACT = "CONTRACT",
  BIRTHDAY = "BIRTHDAY",
  OTHER = "OTHER",
}

@Entity("group_notifications")
export class GroupNotification extends AppBaseEntity {
  @Column({
    type: "enum",
    enum: GroupNotificationType,
    default: GroupNotificationType.OTHER,
  })
  type: GroupNotificationType;

  @ManyToMany(() => Employee, (employee) => employee.groupNotifications, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  members: Employee[];
}

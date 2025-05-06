import { Column, Entity, ManyToOne } from "typeorm";
import { User } from "./User";
import { AppBaseEntity } from "./AppBase";

export enum ENotificationType {
  ORDER = "order",
  CHAT = "chat",
  MAIL = "mail",
  DELIVERY = "delivery",
}

@Entity("notifications")
export class Notification extends AppBaseEntity {
  @Column()
  content: string;

  @Column({
    type: "enum",
    enum: ENotificationType,
    default: ENotificationType.MAIL,
  })
  contentType: string;

  @Column({ nullable: true })
  category: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true, type: "jsonb" })
  actions?: object | null;

  @ManyToOne(() => User, (assignee) => assignee.notifications)
  assignee: User;
}

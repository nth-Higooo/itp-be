import { Column, Entity, ManyToMany, OneToMany } from "typeorm";
import { User } from "./User";
import { Permission } from "./Permission";
import { AppBaseEntity } from "./AppBase";

@Entity("roles")
export class Role extends AppBaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToMany(() => User, (user) => user.roles, {
    onDelete: "CASCADE",
  })
  users: User[];

  @OneToMany(() => Permission, (permission) => permission.role)
  permissions: Permission[];
}

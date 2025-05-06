import { Column, Entity } from "typeorm";
import { AppBaseEntity } from "./AppBase";

@Entity("holidays")
export default class Holiday extends AppBaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  startDate?: Date;

  @Column({ nullable: true })
  endDate?: Date;
}

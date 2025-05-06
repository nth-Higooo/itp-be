import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { Role } from "./Role";
import { AppBaseEntity } from "./AppBase";

@Entity("permissions")
export class Permission extends AppBaseEntity {
  @Column()
  name: string;

  @Column({ default: false })
  canView: boolean;

  @Column({ default: false })
  canCreate: boolean;

  @Column({ default: false })
  canRead: boolean;

  @Column({ default: false })
  canUpdate: boolean;

  @Column({ default: false })
  canDelete: boolean;

  @Column({ default: false })
  canSetPermission: boolean;

  @Column({ default: false })
  canImport: boolean;

  @Column({ default: false })
  canExport: boolean;

  @Column({ default: false })
  canSubmit: boolean;

  @Column({ default: false })
  canCancel: boolean;

  @Column({ default: false })
  canApprove: boolean;

  @Column({ default: false })
  canReject: boolean;

  @Column({ default: false })
  canReport: boolean;

  @Column({ default: false })
  canAssign: boolean;

  @Column({ default: false })
  canViewPartial: boolean;

  @Column({ default: false })
  canViewBelongTo: boolean;

  @Column({ default: false })
  canViewOwner: boolean;

  @Column({ default: false })
  canPermanentlyDelete: boolean;

  @Column({ default: false })
  canRestore: boolean;

  @Column({ default: false })
  canClone: boolean;

  @Column({ default: false })
  canViewSalary: boolean;

  @Column({ default: false })
  canEditSalary: boolean;

  @Column({ default: false })
  canSendEmail: boolean;

  @Column({ default: false })
  canViewTimekeeperUser: boolean;

  @Column({ default: false })
  canViewBenefit: boolean;

  @Column({ default: false })
  canEditBenefit: boolean;

  @Column({ default: false })
  canAddMember: boolean;

  @Column({ default: false })
  canRemoveMember: boolean;

  @Column({ default: false })
  canEditMember: boolean;

  @ManyToOne(() => Role)
  @JoinColumn({ name: "roleId", referencedColumnName: "id" })
  role: Role;
}

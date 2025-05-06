import { DataSource } from "typeorm";
import { MediaType } from "./enums";
import { User } from "../database/entities/User";
import { Socket } from "socket.io";

export interface IUserPermission {
  permission: string;
  canView?: boolean;
  canCreate?: boolean;
  canRead?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  canSetPermission?: boolean;
  canImport?: boolean;
  canExport?: boolean;
  canSubmit?: boolean;
  canCancel?: boolean;
  canApprove?: boolean;
  canReject?: boolean;
  canReport?: boolean;
  canAssign?: boolean;
  canViewPartial?: boolean;
  canViewBelongTo?: boolean;
  canViewOwner?: boolean;
  canPermanentlyDelete?: boolean;
  canClone?: boolean;
  canRestore?: boolean;
  canViewSalary?: boolean;
  canEditSalary?: boolean;
  canSendEmail?: boolean;
  canViewTimekeeperUser?: boolean;
  canViewBenefit?: boolean;
  canEditBenefit?: boolean;
  canAddMember?: boolean;
  canRemoveMember?: boolean;
  canEditMember?: boolean;
}

export interface IAuthorize {
  permissions: IUserPermission[] | string;
  handlerName: string | symbol;
}

export interface Media {
  url: string;
  type: MediaType;
}

export interface IAttendanceTimeSheet {
  uid: number;
  id: number;
  state: number;
  timestamp: string;
}
export interface IUserTimeSheet {
  uid: number;
  role: number;
  password: string;
  name: string;
  cardno: number;
  userid: string;
}
export interface IGroupAttendance {
  day: string;
  times: string[];
}
export interface IDayWithStatus {
  date: string;
  isWeekend: boolean;
}

export interface ICreateNotification {
  socket: Socket;
  dataSource: DataSource;
  content: string;
  contentType?: string;
  actions?: any;
  assignee: User | string;
  createdBy: string;
}

export interface IDepartment {
  id: string;
  isManager: boolean;
  managerId: string | undefined;
  employeeIds: string[];
}

export interface IProject {
  id: string;
  isProjectManager: boolean;
  projectManagerId: string | undefined;
  employeeIds: string[];
}

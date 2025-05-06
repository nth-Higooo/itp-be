import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { User } from "./User";
import { AppBaseEntity } from "./AppBase";
import { Position } from "./Position";
import { Contract } from "./Contract";
import { EmployeeDepartment } from "./EmployeeDepartment";
import { LeaveRequest } from "./LeaveRequest";
import { ProjectEmployee } from "./ProjectEmployee";
import { Project } from "./Project";
import { Education } from "./Education";
import { Skill } from "./Skill";
import { Company } from "./Company";
import { GroupNotification } from "./GroupNotification";
import { EmployeeChildren } from "./EmployeeChildren";
import { RemainingAnnualLeave } from "./RemainingAnnualLeave";

export enum Gender {
  MALE = "Male",
  FEMALE = "Female",
  OTHER = "Other",
}

export enum MaritalStatus {
  Single = "Single",
  Marriage = "Marriage",
  Divorce = "Divorce",
  Widow = "Widow",
}

@Entity("employees")
export class Employee extends AppBaseEntity {
  @ManyToOne(() => User, (user) => user.employee, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId", referencedColumnName: "id" })
  user: User;

  @ManyToOne(() => Position, (position) => position.employees)
  @JoinColumn({ name: "positionId", referencedColumnName: "id" })
  position?: Position;

  @ManyToOne(() => Company, (company) => company.employees)
  @JoinColumn({ name: "companyId", referencedColumnName: "id" })
  corporate?: Company;

  @OneToMany(() => Contract, (contract) => contract.employee)
  contracts: Contract[];

  @OneToMany(
    () => EmployeeDepartment,
    (employeeDepartment) => employeeDepartment.employee
  )
  departments: EmployeeDepartment[];

  // REMAINING ANNUAL LEAVE
  @OneToMany(
    () => RemainingAnnualLeave,
    (remainingAnnualLeave) => remainingAnnualLeave.employee
  )
  remainingAnnualLeaves: RemainingAnnualLeave[];

  //CHILDREN
  @OneToMany(
    () => EmployeeChildren,
    (employeeChildren) => employeeChildren.employee
  )
  children: EmployeeChildren[];

  // LEAVE REQUEST
  @OneToMany(() => LeaveRequest, (leaveRequest) => leaveRequest.approver)
  leaveRequestsApproval: LeaveRequest[];

  @OneToMany(() => LeaveRequest, (leaveRequest) => leaveRequest.employee)
  leaveRequests: LeaveRequest[];

  // PROJECT
  @OneToMany(
    () => ProjectEmployee,
    (projectEmployee) => projectEmployee.employee
  )
  projectEmployees: ProjectEmployee[];

  @OneToMany(() => Project, (project) => project.accountManager)
  accountManagers: Project[];

  @OneToMany(() => Project, (project) => project.projectManager)
  projectManagers: Project[];

  // SKILLS
  @OneToMany(() => Education, (education) => education.employee)
  educations: Education[];

  @OneToMany(() => Skill, (skill) => skill.employee)
  skills: Skill[];

  // GROUP NOTIFICATION
  @ManyToMany(
    () => GroupNotification,
    (groupNotification) => groupNotification.members
  )
  @JoinTable({
    name: "employees_group_notifications",
    joinColumn: { name: "employeeId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "groupId" },
  })
  groupNotifications: GroupNotification[];

  @Column()
  photo: string;

  @Column()
  fullName: string;

  @Column({ unique: true, nullable: true })
  employeeCode?: string;

  @Column({ nullable: true })
  personalEmail?: string;

  @Column({ nullable: true })
  dateOfBirth?: Date;

  @Column({ nullable: true })
  placeOfBirth?: string;

  @Column({ type: "enum", enum: Gender, nullable: true })
  gender?: string;

  @Column({
    type: "enum",
    enum: MaritalStatus,
    default: MaritalStatus.Single,
    nullable: true,
  })
  maritalStatus?: string;

  @Column({ nullable: true })
  contactAddress?: string;

  @Column({ nullable: true })
  permanentAddress?: string;

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ nullable: true })
  homeTown?: string;

  @Column({ nullable: true, type: "jsonb" })
  changedInformation?: object | null;

  @Column({ nullable: true })
  recommendedRoleIds: string;

  @Column({ nullable: true })
  personalCV: string;

  @Column({ nullable: true })
  companyCV: string;

  //RATE
  @Column({ nullable: true })
  monthlyRate?: string;
  @Column({ nullable: true })
  hourlyRate?: string;

  //GOVERNMENT
  @Column({ nullable: true })
  vneIDNo?: string;

  @Column({ nullable: true })
  vneIDDate?: Date;

  @Column({ nullable: true })
  vneIDPlace?: string;

  @Column({ nullable: true })
  vneIDCardFront?: string;

  @Column({ nullable: true })
  vneIDCardBack?: string;

  @Column({ nullable: true })
  pitNo?: string;

  @Column({ nullable: true })
  siNo?: string;

  // EMERGENCY CONTACT
  @Column({ nullable: true })
  ecRelationship?: string;

  @Column({ nullable: true })
  ecName?: string;

  @Column({ nullable: true })
  ecPhoneNumber?: string;

  // BANK
  @Column({ nullable: true })
  bankName?: string;

  @Column({ nullable: true })
  bankBranch?: string;

  @Column({ nullable: true })
  bankAccountName?: string;

  @Column({ nullable: true })
  bankAccountNumber?: string;

  // TIMESHEET
  @Column({ nullable: true })
  fingerprintId?: string;

  @Column({ nullable: true })
  payslipPassword?: string;

  // DATE
  @Column({ type: "date", nullable: true })
  joinDate?: Date;

  @Column({ type: "date", nullable: true })
  leaveDate: Date;

  @Column({ type: "date", nullable: true })
  resignDate: Date;

  @Column({ nullable: true })
  resignReason: string;

  // SALARY
  @Column({ nullable: true })
  basicSalary?: string;

  @Column({ nullable: true })
  responsibilityAllowance?: string;

  @Column({ nullable: true })
  petrolAllowance?: string;

  @Column({ nullable: true })
  phoneAllowance?: string;

  @Column({ nullable: true })
  lunchAllowance?: string;

  @Column({ nullable: true })
  parkingAllowance?: string;

  @Column({ nullable: true })
  seniorityBonus?: string;

  @Column({ nullable: true })
  performanceBonus?: string;

  @Column({ nullable: true })
  overtimeIncome?: string;

  @Column({ nullable: true })
  otherBonus?: string;

  @Column({ nullable: true })
  otherIncome?: string;

  @Column({ nullable: true })
  socialInsurance?: string;

  @Column({ nullable: true })
  personalIncomeTax?: string;

  @Column({ nullable: true })
  othersDeduction?: string;

  @Column({ nullable: true })
  netAmount?: string;

  @Column({ nullable: true })
  siPayment?: string;

  // BENEFITS
  @Column({ nullable: true })
  healthCare?: string;

  @Column({ nullable: true })
  healthCheck?: string;

  @Column({ nullable: true })
  teamFund?: string;

  @Column({ nullable: true })
  parkingFee?: string;

  @Column({ nullable: true })
  birthdayGift?: string;

  @Column({ nullable: true })
  midAutumnGift?: string;

  @Column({ nullable: true })
  tetGift?: string;

  @Column({ nullable: true })
  YEP?: string;

  @Column({ nullable: true })
  companyTrip?: string;

  // NOTE
  @Column({ nullable: true })
  notes?: string;
}

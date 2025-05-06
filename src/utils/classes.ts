import { encryptSalary, removeCommas, validateNumber } from ".";
import { ContractTypes, WorkingTypes } from "../database/entities/Contract";
import { Gender, MaritalStatus } from "../database/entities/Employee";

export interface IEmployeeInfoFromFile {
  employeeCode: string;
  employeeName: string;
  joinDate?: Date;
  corporate?: string;
  department?: string;
  position?: string;
  level?: string;
  gender?: string;
  dateOfBirth: Date;
  placeOfBirth?: string;
  phoneNumber?: string;
  email: string;
  personalEmail?: string;
  homeTown?: string;
  vneIDNo?: string;
  vneIDDate?: Date;
  vneIDPlace?: string;
  school?: string;
  degree?: string;
  major?: string;
  fromYear?: string;
  toYear?: string;
  pit?: string;
  si?: string;
  bankAccount?: string;
  bankName?: string;
  permanentAddress?: string;
  contactAddress?: string;
  maritalStatus?: MaritalStatus;
  firstChildName?: string;
  firstChildDob?: Date;
  secondChildName?: string;
  secondChildDob?: Date;
  ecRelationship?: string;
  ecName?: string;
  ecPhoneNumber?: string;
  notes?: string;
  contractNumber?: string;
  contractType?: string;
  workingType?: string;
  contractStartDate?: Date;
  contractEndDate?: Date;
  isRemote?: string;
}

export class EmployeeInfoFromFile {
  employeeCode: string;
  employeeName: string;
  joinDate?: Date;
  corporate?: string;
  department?: string;
  position?: string;
  level?: string;
  gender?: string;
  dateOfBirth: Date;
  placeOfBirth?: string;
  phoneNumber?: string;
  email: string;
  personalEmail?: string;
  homeTown?: string;
  vneIDNo?: string;
  vneIDDate?: Date;
  vneIDPlace?: string;
  school?: string;
  degree?: string;
  major?: string;
  fromYear?: string;
  toYear?: string;
  pit?: string;
  si?: string;
  bankAccount?: string;
  bankName?: string;
  permanentAddress?: string;
  contactAddress?: string;
  maritalStatus?: MaritalStatus;
  firstChildName?: string;
  firstChildDob?: Date;
  secondChildName?: string;
  secondChildDob?: Date;
  ecRelationship?: string;
  ecName?: string;
  ecPhoneNumber?: string;
  notes?: string;
  contractNumber?: string;
  contractType?: string;
  workingType?: string;
  contractStartDate?: Date;
  contractEndDate?: Date;
  isRemote?: boolean;
  constructor(employee: IEmployeeInfoFromFile) {
    this.employeeCode = employee.employeeCode.trim();
    this.employeeName = employee.employeeName.trim();
    this.joinDate = employee?.joinDate ? employee.joinDate : undefined;
    this.corporate = employee?.corporate ? employee.corporate.trim() : "";
    this.department = employee?.department ? employee.department.trim() : "";
    this.position = employee?.position ? employee.position.trim() : "";
    this.level = employee?.level ? employee.level.trim() : "";
    this.gender =
      employee.gender?.trim() !== ""
        ? (employee.gender?.trim() as Gender)
        : undefined;
    this.dateOfBirth = employee.dateOfBirth;
    this.placeOfBirth = employee?.placeOfBirth
      ? employee.placeOfBirth.trim()
      : "";
    this.phoneNumber = employee.phoneNumber?.trim();
    this.email = employee.email.trim();
    this.personalEmail = employee.personalEmail?.trim();
    this.homeTown = employee.homeTown?.trim();
    this.vneIDNo = employee.vneIDNo?.trim();
    this.vneIDDate = employee?.vneIDDate ? employee.vneIDDate : undefined;
    this.vneIDPlace = employee.vneIDPlace?.trim();
    this.school = employee.school?.trim();
    this.degree = employee.degree?.trim();
    this.major = employee.major?.trim();
    this.fromYear = employee.fromYear?.trim();
    this.toYear = employee.toYear?.trim();
    this.pit = employee.pit?.trim();
    this.si = employee.si?.trim();
    this.bankAccount = employee.bankAccount?.trim();
    this.bankName = employee.bankName?.trim();
    this.permanentAddress = employee.permanentAddress?.trim();
    this.contactAddress = employee.contactAddress?.trim();
    this.maritalStatus =
      employee.maritalStatus?.trim() !== ""
        ? (employee.maritalStatus?.trim() as MaritalStatus)
        : undefined;
    this.firstChildName = employee.firstChildName?.trim();
    this.firstChildDob = employee?.firstChildDob
      ? employee.firstChildDob
      : undefined;
    this.secondChildName = employee.secondChildName?.trim();
    this.secondChildDob = employee?.secondChildDob
      ? employee.secondChildDob
      : undefined;
    this.ecRelationship = employee.ecRelationship?.trim();
    this.ecName = employee.ecName?.trim();
    this.ecPhoneNumber = employee.ecPhoneNumber?.trim();
    this.notes = employee.notes?.trim();
    this.contractNumber = employee.contractNumber?.trim();
    this.contractType =
      employee.contractType?.trim() !== ""
        ? (employee.contractType?.trim() as ContractTypes)
        : undefined;
    this.workingType =
      employee.workingType?.trim() !== ""
        ? (employee.workingType?.trim() as WorkingTypes)
        : undefined;
    this.contractStartDate = employee?.contractStartDate
      ? employee.contractStartDate
      : undefined;
    this.contractEndDate = employee?.contractEndDate
      ? employee.contractEndDate
      : undefined;
    this.isRemote =
      employee.isRemote?.toLocaleLowerCase() === "true" ? true : false;
  }
}
export interface ISalaryInfoFromFile {
  stt?: number;
  employeeCode: string;
  employeeName: string;
  basicSalary?: string;
  responsibilityAllowance?: string;
  petrolAllowance?: string;
  phoneAllowance?: string;
  lunchAllowance?: string;
  seniorityBonus?: string;
  performanceBonus?: string;
  overtimeIncome?: string;
  otherBonus?: string;
  otherIncome?: string;
  socialInsurance?: string;
  personalIncomeTax?: string;
  othersDeduction?: string;
  netAmount?: string;
}

export class SalaryInfoFromFile {
  stt?: number;
  employeeCode: string;
  employeeName: string;
  basicSalary?: string;
  responsibilityAllowance?: string;
  petrolAllowance?: string;
  phoneAllowance?: string;
  lunchAllowance?: string;
  seniorityBonus?: string;
  performanceBonus?: string;
  overtimeIncome?: string;
  otherBonus?: string;
  otherIncome?: string;
  socialInsurance?: string;
  personalIncomeTax?: string;
  othersDeduction?: string;
  netAmount?: string;
  constructor(salaryInfo: ISalaryInfoFromFile) {
    this.stt = salaryInfo.stt;
    this.employeeCode = salaryInfo.employeeCode?.trim();
    this.employeeName = salaryInfo.employeeName?.trim();
    this.basicSalary = validateNumber(salaryInfo?.basicSalary!)
      ? encryptSalary(Number(removeCommas(salaryInfo.basicSalary!)))
      : undefined;
    this.responsibilityAllowance = validateNumber(
      salaryInfo?.responsibilityAllowance!
    )
      ? encryptSalary(Number(removeCommas(salaryInfo.responsibilityAllowance!)))
      : undefined;
    this.petrolAllowance = validateNumber(salaryInfo?.petrolAllowance!)
      ? encryptSalary(Number(removeCommas(salaryInfo.petrolAllowance!)))
      : undefined;
    this.phoneAllowance = validateNumber(salaryInfo?.phoneAllowance!)
      ? encryptSalary(Number(removeCommas(salaryInfo.phoneAllowance!)))
      : undefined;
    this.lunchAllowance = validateNumber(salaryInfo?.lunchAllowance!)
      ? encryptSalary(Number(removeCommas(salaryInfo.lunchAllowance!)))
      : undefined;
    this.seniorityBonus = validateNumber(salaryInfo?.seniorityBonus!)
      ? encryptSalary(Number(removeCommas(salaryInfo.seniorityBonus!)))
      : undefined;
    this.performanceBonus = validateNumber(salaryInfo?.performanceBonus!)
      ? encryptSalary(Number(removeCommas(salaryInfo.performanceBonus!)))
      : undefined;
    this.overtimeIncome = validateNumber(salaryInfo?.overtimeIncome!)
      ? encryptSalary(Number(removeCommas(salaryInfo.overtimeIncome!)))
      : undefined;
    this.otherBonus = validateNumber(salaryInfo?.otherBonus!)
      ? encryptSalary(Number(removeCommas(salaryInfo.otherBonus!)))
      : undefined;
    this.otherIncome = validateNumber(salaryInfo?.otherIncome!)
      ? encryptSalary(Number(removeCommas(salaryInfo.otherIncome!)))
      : undefined;
    this.socialInsurance = validateNumber(salaryInfo?.socialInsurance!)
      ? encryptSalary(Number(removeCommas(salaryInfo.socialInsurance!)))
      : undefined;
    this.personalIncomeTax = validateNumber(salaryInfo?.personalIncomeTax!)
      ? encryptSalary(Number(removeCommas(salaryInfo.personalIncomeTax!)))
      : undefined;
    this.othersDeduction = validateNumber(salaryInfo?.othersDeduction!)
      ? encryptSalary(Number(removeCommas(salaryInfo.othersDeduction!)))
      : undefined;
    this.netAmount = validateNumber(salaryInfo?.netAmount!)
      ? encryptSalary(Number(removeCommas(salaryInfo.netAmount!)))
      : undefined;
  }
}

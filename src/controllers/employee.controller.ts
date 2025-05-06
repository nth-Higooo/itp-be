import { NextFunction, Request, Response } from "express";
import { Brackets, In, IsNull, Not } from "typeorm";
import config from "../configuration";
import fs from "fs";
import path from "path";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import Controller from "../decorators/controller";
import { Delete, Get, Post, Put } from "../decorators/handlers";
import {
  BadRequestError,
  ForbiddenError,
  NotAcceptableError,
  NotFoundError,
} from "../utils/errors";
import { UserPermission } from "../utils/permission";
import {
  calculateMinutesBetweenTimes,
  checkPermission,
  clearSignAndUppercase,
  compareDatesByDayMonthYear,
  convertHoursToTime,
  decryptSalary,
  encryptSalary,
  generateFileName,
  generateUniqueString,
  getDaysInMonth,
  getHashPassword,
  omit,
  pick,
  removeEmptyValues,
} from "../utils";
import { Employee } from "../database/entities/Employee";
import { User, UserStatus } from "../database/entities/User";
import { Position } from "../database/entities/Position";
import { Department } from "../database/entities/Department";
import { EmployeeDepartment } from "../database/entities/EmployeeDepartment";
import {
  Contract,
  ContractStatus,
  ContractTypes,
} from "../database/entities/Contract";
import {
  handleUploadCSV,
  handleUploadExcel,
  handleUploadTimeSheet,
} from "../utils/file";
import xlsx from "xlsx";
import {
  EmployeeInfoFromFile,
  IEmployeeInfoFromFile,
  SalaryInfoFromFile,
} from "../utils/classes";
import { Role } from "../database/entities/Role";
import { sendMail } from "../utils/email";
import { IAttendanceTimeSheet, IDayWithStatus } from "../utils/interfaces";
import {
  LeaveRequest,
  LeaveRequestStatus,
} from "../database/entities/LeaveRequest";
import { createNotification } from "../database/repositories/notification.repository";
import { Company } from "../database/entities/Company";
import { Education } from "../database/entities/Education";
import { Degree } from "../database/entities/Degree";
import csvParser from "csv-parser";
import { benefitFields, salaryFields } from "../utils/constants";
import {
  GroupNotification,
  GroupNotificationType,
} from "../database/entities/GroupNotification";
import { EmployeeChildren } from "../database/entities/EmployeeChildren";
import {
  RemainingAnnualLeave,
  RemainingAnnualLeaveStatus,
} from "../database/entities/RemainingAnnualLeave";
import { LeaveType } from "../database/entities/LeaveType";

@Controller("/employees")
@Authenticate()
export default class EmployeeController {
  @Get("/export-excel")
  @Authorize([
    { permission: UserPermission.EMPLOYEE_MANAGEMENT, canExport: true },
  ])
  public async exportExcelFile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;

      const employeeRepository = dataSource.getRepository(Employee);

      const {
        pageSize,
        pageIndex,
        search,
        departmentId,
        positionId,
        status,
        employeeStatus,
        sortBy = "updatedAt",
        orderBy = "DESC",
      } = req.query;

      const employeesQuery = employeeRepository
        .createQueryBuilder("employee")
        .innerJoinAndSelect("employee.user", "user")
        .leftJoinAndSelect("employee.position", "position")
        .leftJoinAndSelect("employee.children", "children")
        .leftJoinAndSelect("employee.educations", "educations")
        .leftJoinAndSelect("educations.degree", "degree")
        .leftJoinAndSelect("employee.corporate", "corporate")
        .leftJoinAndSelect("employee.departments", "employees_departments")
        .leftJoinAndSelect("employees_departments.department", "departments")
        .leftJoinAndSelect("employee.contracts", "contracts");
      // filter
      if (status) {
        employeesQuery.andWhere("user.status = :status", { status });
      }

      if (departmentId) {
        employeesQuery.andWhere("departments.id = :departmentId", {
          departmentId,
        });
      }

      if (positionId) {
        employeesQuery.andWhere("position.id = :positionId", { positionId });
      }

      // search
      if (search) {
        employeesQuery.andWhere(
          new Brackets((qb) => {
            qb.where("employee.fullName ILIKE :search", {
              search: `%${search}%`,
            }).orWhere("user.email ILIKE :search", { search: `%${search}%` });
          })
        );
      } else {
        // sort
        let objQuery: string = "employee";
        let objProperty: string = "updatedAt";

        if (sortBy !== "updatedAt") {
          switch (sortBy) {
            case "name": {
              objProperty = "fullName";
              break;
            }
            case "email": {
              objQuery = "user";
              objProperty = "email";
              break;
            }
          }
        }

        employeesQuery.orderBy(
          `${objQuery}.${objProperty}`,
          orderBy === "asc" ? "ASC" : "DESC"
        );

        if (employeeStatus) {
          switch (employeeStatus) {
            case "active":
              employeesQuery.andWhere("contracts.status = :status", {
                status: ContractStatus.ACTIVE,
              });
              break;
            case "resign":
              employeesQuery.andWhere("employee.resignDate IS NOT NULL");
              break;
            case "trash":
              employeesQuery.withDeleted();
              employeesQuery.andWhere("employee.deletedAt IS NOT NULL");
              break;
            case "no_contract":
              employeesQuery.andWhere("contracts IS NULL");
              break;
          }
        }
      }

      // pagination
      if (pageSize && pageIndex) {
        employeesQuery
          .skip(Number(pageSize) * (Number(pageIndex) - 1))
          .take(Number(pageSize));
      }

      const allEmployees = await employeesQuery.getMany();

      const formatData = allEmployees.map(
        (employee: Employee, index: number) => ({
          employeeCode: employee?.employeeCode,
          employeeName: employee?.fullName,
          startDate: employee?.joinDate
            ? new Date(employee.joinDate).toLocaleString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            : null,
          corporate: employee?.corporate?.name,
          department: employee?.departments[0]?.department?.name,
          position: employee?.position?.name,
          exp_level: employee?.position?.level,
          gender: employee?.gender,
          date_of_birth: employee?.dateOfBirth
            ? new Date(employee.dateOfBirth).toLocaleString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            : null,
          place_of_birth: employee?.placeOfBirth,
          phone: employee?.phoneNumber,
          email: employee?.user?.email,
          personalEmail: employee?.personalEmail,
          hometown: employee?.homeTown,
          id_number: employee?.vneIDNo,
          date_issued: employee?.vneIDDate
            ? new Date(employee.vneIDDate).toLocaleString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            : null,
          place_issues: employee?.vneIDPlace,
          school: employee?.educations[0]?.school,
          degree: employee?.educations[0]?.degree?.name,
          major: employee?.educations[0]?.major,
          school_from: employee?.educations[0]?.fromYear,
          school_to: employee?.educations[0]?.toYear,
          pit_number: employee?.pitNo,
          si_number: employee?.siNo,
          bank_account: employee?.bankAccountNumber,
          bank_name: employee?.bankName,
          permanent_address: employee?.permanentAddress,
          contact_address: employee?.contactAddress,
          maritalStatus: employee?.maritalStatus,
          first_child_name: employee?.children[0]?.name,
          first_child_dob: employee?.children[0]?.dob
            ? new Date(employee.children[0]?.dob).toLocaleString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            : null,
          second_child_name: employee?.children[1]?.name,
          second_child_dob: employee?.children[1]?.dob
            ? new Date(employee.children[1]?.dob).toLocaleString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            : null,
          emergency_contact_relationship: employee?.ecRelationship,
          emergency_contact_name: employee?.ecName,
          emergency_contact_phone: employee?.ecPhoneNumber,
          notes: employee?.notes,
          contract_number: employee?.contracts[0]?.no,
          contract_type: employee?.contracts[0]?.contractType,
          working_type: employee?.contracts[0]?.workingType,
          contract_start_date: employee?.contracts[0]?.startDate
            ? new Date(employee?.contracts[0]?.startDate).toLocaleString(
                "en-US",
                {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }
              )
            : null,
          contract_end_date: employee?.contracts[0]?.endDate
            ? new Date(employee?.contracts[0]?.endDate).toLocaleString(
                "en-US",
                {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }
              )
            : null,
          bool_remote: employee?.contracts[0]?.isRemote,
        })
      );

      const worksheet = xlsx.utils.json_to_sheet(formatData);
      const workbook = xlsx.utils.book_new();
      const fileName = generateFileName("Employees", true, "xlsx");
      xlsx.utils.book_append_sheet(workbook, worksheet, "Employees");

      const headers = [
        "badge_id",
        "full_name",
        "start_date",
        "corporate",
        "department",
        "position",
        "exp_level",
        "gender",
        "date_of_birth",
        "place_of_birth",
        "phone",
        "email",
        "personalEmail",
        "hometown",
        "id_number",
        "date_issued",
        "place_issues",
        "school",
        "degree",
        "major",
        "school_from",
        "school_to",
        "pit_number",
        "si_number",
        "bank_account",
        "bank_name",
        "permanent_address",
        "contact_address",
        "marital_status",
        "first_child_name",
        "first_child_dob",
        "second_child_name",
        "second_child_dob",
        "emergency_contact_relationship",
        "emergency_contact_name",
        "emergency_contact_phone",
        "notes",
        "contract_number",
        "contract_type",
        "working_type",
        "contract_start_date",
        "contract_end_date",
        "bool_remote",
      ];

      xlsx.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

      worksheet["!cols"] = [
        { wch: 5 },
        { wch: 15 },
        { wch: 25 },
        { wch: 25 },
        { wch: 15 },
        { wch: 10 },
        { wch: 15 },
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
      ];

      const buf = xlsx.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.statusCode = 200;
      res.locals.message = "Exported successfully";
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
      res.setHeader("Content-Type", "application/vnd.ms-excel");
      res.end(buf);
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.EMPLOYEE_MANAGEMENT, canRead: true },
  ])
  @Get("/")
  public async getByHRM(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;

      const {
        pageSize,
        pageIndex,
        search,
        departmentId,
        positionId,
        status,
        employeeStatus,
        sortBy = "updatedAt",
        orderBy = "DESC",
      } = req.query;

      const employeeRepository = dataSource.getRepository(Employee);

      const employeesQuery = employeeRepository
        .createQueryBuilder("employee")
        .innerJoin("employee.user", "user")
        .leftJoin("employee.position", "position")
        .leftJoin("employee.departments", "employees_departments")
        .leftJoin("employees_departments.department", "departments")
        .leftJoin("employee.contracts", "contracts");

      // filter
      if (status) {
        employeesQuery.andWhere("user.status = :status", { status });
      }

      if (departmentId) {
        employeesQuery.andWhere("departments.id = :departmentId", {
          departmentId,
        });
      }

      if (positionId) {
        employeesQuery.andWhere("position.id = :positionId", { positionId });
      }

      // search
      if (search) {
        employeesQuery.andWhere(
          new Brackets((qb) => {
            qb.where("employee.fullName ILIKE :search", {
              search: `%${search}%`,
            }).orWhere("user.email ILIKE :search", { search: `%${search}%` });
          })
        );
      } else {
        // sort
        let objQuery: string = "employee";
        let objProperty: string = "updatedAt";

        if (sortBy !== "updatedAt") {
          switch (sortBy) {
            case "name": {
              objProperty = "fullName";
              break;
            }
            case "email": {
              objQuery = "user";
              objProperty = "email";
              break;
            }
            case "working_type": {
              objQuery = "contracts";
              objProperty = "workingType";
              break;
            }
            case "contract_type": {
              objQuery = "contracts";
              objProperty = "contractType";
              break;
            }
          }
        }

        employeesQuery.orderBy(
          `${objQuery}.${objProperty}`,
          orderBy === "asc" ? "ASC" : "DESC"
        );
      }

      const today = new Date();
      if (employeeStatus) {
        switch (employeeStatus) {
          case "active":
            employeesQuery.andWhere(
              new Brackets((qb) => {
                qb.where("employee.resignDate IS NULL").orWhere(
                  "employee.resignDate > :today",
                  { today }
                );
              })
            );
            break;
          case "resign":
            employeesQuery
              .where("employee.resignDate IS NOT NULL")
              .andWhere("employee.resignDate <= :today", { today });
            break;
          case "trash":
            employeesQuery
              .withDeleted()
              .andWhere("employee.deletedAt IS NOT NULL");
            break;
          case "no_contract":
            employeesQuery.andWhere("contracts IS NULL");
            break;
        }
      }
      // pagination
      const count = await employeesQuery.getCount();

      if (pageSize && pageIndex) {
        employeesQuery
          .skip(Number(pageSize) * (Number(pageIndex) - 1))
          .take(Number(pageSize));
      }

      const allEmployees = await employeesQuery
        .select([
          "employee.id",
          "employee.fullName",
          "employee.updatedAt",
          "employee.deletedAt",
          "employee.leaveDate",
          "employee.joinDate",
          "employee.resignDate",
          "employee.resignReason",
          "employee.photo",
          "user.id",
          "user.email",
          "user.status",
          "contracts.id",
          "contracts.contractType",
          "contracts.workingType",
          "contracts.status",
          "position.id",
          "position.name",
          "position.level",
          "employees_departments",
          "departments.id",
          "departments.name",
        ])
        .getMany();

      let flattenEmployees = allEmployees.map((employee: any) => {
        return {
          id: employee.id,
          userId: employee.user.id,
          updatedAt: employee.updatedAt,
          deletedAt: employee.deletedAt,
          fullName: employee.fullName,
          email: employee.user.email,
          photo: employee.photo,
          status: employee.user.status,
          leaveDate: employee.leaveDate,
          joinDate: employee.joinDate,
          resignDate: employee.resignDate,
          resignReason: employee.resignReason,
          recommendedRoleIds: employee.recommendedRoleIds
            ? employee.recommendedRoleIds.split(",")
            : [],
          position:
            employee?.position &&
            (employee?.position?.level
              ? `${employee?.position?.level} ${employee?.position.name}`
              : employee?.position.name),
          contracts: employee?.contracts,
          departments: employee?.departments?.map(
            (item: EmployeeDepartment) => item.department
          ),
        };
      });

      res.locals.data = {
        pageSize: pageSize ? Number(pageSize) : null,
        pageIndex: pageIndex ? Number(pageIndex) : null,
        count,
        employees: flattenEmployees,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.EMPLOYEE_MANAGEMENT, canRead: true },
  ])
  @Get("/manager")
  public async getByManager(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { session } = res.locals;
      const {
        pageSize,
        pageIndex,
        search,
        departmentId,
        positionId,
        sortBy = "updatedAt",
        orderBy = "DESC",
      } = req.query;

      const employeeRepository = dataSource.getRepository(Employee);

      const employeeDepartmentRepository =
        dataSource.getRepository(EmployeeDepartment);
      const managerDepartments = await employeeDepartmentRepository.find({
        relations: ["department"],
        where: {
          employee: {
            id: session.employeeId,
          },
          isManager: true,
        },
      });
      if (managerDepartments.length === 0) {
        throw new NotAcceptableError("You are not a manager of any department");
      }
      const departmentIds = managerDepartments.map(
        (managerDepartments: EmployeeDepartment) =>
          managerDepartments.department.id
      );

      const employeesQuery = employeeRepository
        .createQueryBuilder("employee")
        .innerJoin("employee.user", "user")
        .leftJoin("employee.position", "position")
        .leftJoin("employee.departments", "employees_departments")
        .leftJoin("employees_departments.department", "departments")
        .where("departments.id IN (:...departmentIds)", {
          departmentIds,
        })
        .andWhere("employee.id != :employeeId", {
          employeeId: session.employeeId,
        });

      if (departmentId) {
        employeesQuery.andWhere("departments.id = :departmentId", {
          departmentId,
        });
      }

      if (positionId) {
        employeesQuery.andWhere("position.id = :positionId", { positionId });
      }

      // search
      if (search) {
        employeesQuery.andWhere(
          new Brackets((qb) => {
            qb.where("employee.fullName ILIKE :search", {
              search: `%${search}%`,
            }).orWhere("user.email ILIKE :search", { search: `%${search}%` });
          })
        );
      } else {
        // sort
        let objQuery: string = "employee";
        let objProperty: string = "updatedAt";

        if (sortBy !== "updatedAt") {
          switch (sortBy) {
            case "name": {
              objProperty = "fullName";
              break;
            }
            case "email": {
              objQuery = "user";
              objProperty = "email";
              break;
            }
            case "dateOfBirth": {
              objQuery = "employee";
              objProperty = "dateOfBirth";
              break;
            }
            case "contactAddress": {
              objQuery = "employee";
              objProperty = "contactAddress";
              break;
            }
            case "phoneNumber": {
              objQuery = "employee";
              objProperty = "phoneNumber";
              break;
            }
          }
        }

        employeesQuery.orderBy(
          `${objQuery}.${objProperty}`,
          orderBy === "asc" ? "ASC" : "DESC"
        );
      }

      // pagination
      const count = await employeesQuery.getCount();

      if (pageSize && pageIndex) {
        employeesQuery
          .skip(Number(pageSize) * (Number(pageIndex) - 1))
          .take(Number(pageSize));
      }

      const allEmployees = await employeesQuery
        .select([
          "employee.id",
          "employee.fullName",
          "employee.personalEmail",
          "employee.dateOfBirth",
          "employee.contactAddress",
          "employee.phoneNumber",
          "employee.updatedAt",
          "employee.deletedAt",
          "employee.photo",
          "user.id",
          "user.email",
          "user.status",
          "position.id",
          "position.name",
          "position.level",
          "employees_departments",
          "departments.id",
          "departments.name",
        ])
        .getMany();

      let flattenEmployees = await Promise.all(
        allEmployees.map(async (employee: any) => {
          const departments = await employeeDepartmentRepository.find({
            relations: ["department"],
            where: {
              employee: {
                id: employee.id,
              },
            },
          });
          return {
            id: employee.id,
            userId: employee.user.id,
            updatedAt: employee.updatedAt,
            deletedAt: employee.deletedAt,
            fullName: employee.fullName,
            email: employee.user.email,
            personalEmail: employee.personalEmail,
            dateOfBirth: employee.dateOfBirth,
            contactAddress: employee.contactAddress,
            phoneNumber: employee.phoneNumber,
            photo: employee.photo,
            position:
              employee?.position &&
              (employee?.position?.level
                ? `${employee?.position?.level} ${employee?.position.name}`
                : employee?.position.name),
            contracts: employee?.contracts,
            departments: departments?.map(
              (item: EmployeeDepartment) => item.department
            ),
          };
        })
      );

      res.locals.data = {
        pageSize: pageSize ? Number(pageSize) : null,
        pageIndex: pageIndex ? Number(pageIndex) : null,
        count,
        employees: flattenEmployees,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Get("/count-all-status")
  @Authorize([
    { permission: UserPermission.EMPLOYEE_MANAGEMENT, canRead: true },
  ])
  public async countAllStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { departmentId, positionId, status } = req.query;
      const today = new Date();

      const employeeRepository = dataSource.getRepository(Employee);
      const departmentRepository = dataSource.getRepository(Department);
      const positionRepository = dataSource.getRepository(Position);

      const employeeQuery = employeeRepository
        .createQueryBuilder("employee")
        .innerJoinAndSelect("employee.user", "user")
        .leftJoinAndSelect("employee.position", "position")
        .leftJoinAndSelect("employee.departments", "employees_departments")
        .leftJoinAndSelect("employees_departments.department", "departments")
        .leftJoinAndSelect("employee.contracts", "contracts");

      if (departmentId) {
        const department: Department | null =
          await departmentRepository.findOne({
            where: { id: departmentId.toString() },
          });
        if (!department) {
          throw new NotFoundError("Department is not found.");
        }

        employeeQuery.andWhere("departments.id = :departmentId", {
          departmentId,
        });
      }

      if (positionId) {
        const position: Position | null = await positionRepository.findOne({
          where: { id: positionId.toString() },
        });
        if (!position) {
          throw new NotFoundError("Position is not found.");
        }

        employeeQuery.andWhere("position.id = :positionId", { positionId });
      }

      if (status) {
        employeeQuery.andWhere("user.status = :status", { status });
      }

      const employeeQuery_1 = employeeQuery.clone();
      const employeeQuery_2 = employeeQuery.clone();
      const employeeQuery_3 = employeeQuery.clone();
      const employeeQuery_4 = employeeQuery.clone();
      const employeeQuery_5 = employeeQuery.clone();

      const [total, totalActive, totalResign, totalNoContract, totalDeleted] =
        await Promise.all([
          employeeQuery_1.getCount(),
          employeeQuery_2
            .andWhere(
              new Brackets((qb) => {
                qb.where("employee.resignDate IS NULL").orWhere(
                  "employee.resignDate > :today",
                  { today }
                );
              })
            )
            .getCount(),
          employeeQuery_3
            .where("employee.resignDate IS NOT NULL")
            .andWhere("employee.resignDate <= :today", { today })
            .getCount(),
          employeeQuery_4.andWhere("contracts IS NULL").getCount(),
          employeeQuery_5
            .withDeleted()
            .where("employee.deletedAt IS NOT NULL")
            .getCount(),
        ]);

      res.locals.data = {
        total,
        totalActive,
        totalResign,
        totalNoContract,
        totalDeleted,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  // @Post("/time-sheet")
  // @Authorize([
  //   {
  //     permission: UserPermission.TIME_SHEET_MANAGEMENT,
  //     canExport: true,
  //   },
  // ])
  // public async exportTimeSheet(
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ): Promise<void> {
  //   try {
  //     const {
  //       month = new Date().getMonth() + 1,
  //       year = new Date().getFullYear(),
  //     } = req.body;
  //     await handleExportAttendanceTimeSheet(month, year);
  //     res.locals.message = "Export time sheet successfully";
  //     next();
  //   } catch (error) {
  //     next(error);
  //   }
  // }

  @Get("/time-sheet")
  @Authorize([
    {
      permission: UserPermission.TIME_SHEET_MANAGEMENT,
      canRead: true,
    },
  ])
  public async getTimeSheet(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;

      const employeeRepository = dataSource.getRepository(Employee);
      const {
        pageSize,
        pageIndex,
        departmentId,
        month = new Date().getMonth() + 1,
        year = new Date().getFullYear(),
        sortBy = "updatedAt",
        orderBy = "DESC",
        search,
      } = req.query;

      //Read timesheet file
      const generalPath = path.resolve(
        config.upload_time_sheet_dir,
        year.toString(),
        month.toString()
      );

      const attendancePath = path.resolve(generalPath, "attendance.json");

      if (!fs.existsSync(attendancePath)) {
        throw new NotFoundError("Time sheet is not found.");
      }

      const employeesQuery = employeeRepository
        .createQueryBuilder("employee")
        .innerJoin("employee.user", "user")
        .leftJoin("employee.position", "position")
        .leftJoin("employee.departments", "employees_departments")
        .leftJoin("employees_departments.department", "departments")
        .leftJoinAndSelect(
          "employee.leaveRequests",
          "leaveRequests",
          "leaveRequests.status = :status",
          { status: LeaveRequestStatus.APPROVED }
        )
        .leftJoinAndSelect("leaveRequests.leaveType", "leaveType");

      if (departmentId) {
        employeesQuery.andWhere("departments.id = :departmentId", {
          departmentId,
        });
      }
      // search
      if (search) {
        employeesQuery.andWhere(
          new Brackets((qb) => {
            qb.where("employee.fullName ILIKE :search", {
              search: `%${search}%`,
            });
          })
        );
      } else {
        // sort
        let objQuery: string = "employee";
        let objProperty: string = "updatedAt";

        if (sortBy !== "updatedAt") {
          switch (sortBy) {
            case "name": {
              objProperty = "fullName";
              break;
            }
          }
        }
        employeesQuery.orderBy(
          `${objQuery}.${objProperty}`,
          orderBy === "asc" ? "ASC" : "DESC"
        );
      }

      //Pagination
      const count = await employeesQuery.getCount();

      if (pageSize && pageIndex) {
        employeesQuery
          .skip(Number(pageSize) * (Number(pageIndex) - 1))
          .take(Number(pageSize));
      }

      const employees: Employee[] = await employeesQuery
        .select([
          "employee.id",
          "employee.fullName",
          "employee.updatedAt",
          "employee.leaveDate",
          "employee.joinDate",
          "employee.resignDate",
          "employee.resignReason",
          "employee.fingerprintId",
          "user.id",
          "user.email",
          "user.status",
          "position.id",
          "position.name",
          "position.level",
          "employees_departments",
          "departments.id",
          "departments.name",
          "leaveRequests",
          "leaveType.name",
        ])
        .getMany();

      //Read timesheet file
      let attendance: IAttendanceTimeSheet[] = JSON.parse(
        fs.readFileSync(attendancePath, "utf8")
      );

      // Filter for current year and month
      attendance = attendance.filter((item: IAttendanceTimeSheet) => {
        const temp = new Date(item.timestamp);
        return (
          temp.getMonth() + 1 === Number(month) &&
          temp.getFullYear() === Number(year)
        );
      });

      //Get all day of month
      const daysOfMonth = getDaysInMonth(Number(month), Number(year));

      //Format Data
      const formatData = employees.map((item: Employee) => {
        if (!item.fingerprintId) {
          return {
            ...item,
            timeSheet: [],
          };
        } else {
          const timeSheet = daysOfMonth.map((day: IDayWithStatus) => {
            const dayString = day.date;
            const times = attendance
              .filter((attendanceTimeSheet: IAttendanceTimeSheet) => {
                const temp = new Date(
                  attendanceTimeSheet.timestamp
                ).toLocaleDateString();

                return (
                  attendanceTimeSheet.id === Number(item.fingerprintId) &&
                  temp === dayString
                );
              })
              .map((attendanceTimeSheet: IAttendanceTimeSheet) => {
                const time = new Date(attendanceTimeSheet.timestamp)
                  .toTimeString()
                  .split(" ")[0];
                return time;
              });

            const date = new Date(dayString);

            const leaveEvents = item.leaveRequests
              .filter(
                (lq: LeaveRequest) =>
                  (compareDatesByDayMonthYear(date, lq.startDate) === 0 ||
                    compareDatesByDayMonthYear(date, lq.startDate) === 1) &&
                  (compareDatesByDayMonthYear(date, lq.endDate) === 0 ||
                    compareDatesByDayMonthYear(date, lq.endDate) === -1)
              )
              .map((leaveRequest: LeaveRequest) => {
                if (
                  compareDatesByDayMonthYear(date, leaveRequest?.startDate) ===
                    0 &&
                  compareDatesByDayMonthYear(date, leaveRequest?.endDate) === 0
                ) {
                  return {
                    leaveType: leaveRequest.leaveType.name,
                    startTime: leaveRequest?.startDate
                      ?.toTimeString()
                      .split(" ")[0],
                    endTime: leaveRequest?.endDate
                      ?.toTimeString()
                      .split(" ")[0],
                  };
                }

                if (
                  compareDatesByDayMonthYear(date, leaveRequest?.startDate) ===
                    0 &&
                  compareDatesByDayMonthYear(date, leaveRequest?.endDate) === -1
                ) {
                  return {
                    leaveType: leaveRequest.leaveType,
                    startTime: leaveRequest?.startDate
                      ?.toTimeString()
                      .split(" ")[0],
                    endTime: "18:00:00",
                  };
                }
                if (
                  compareDatesByDayMonthYear(date, leaveRequest?.startDate) ===
                    1 &&
                  compareDatesByDayMonthYear(date, leaveRequest?.endDate) === -1
                ) {
                  return {
                    leaveType: leaveRequest.leaveType,
                    startTime: "09:00:00",
                    endTime: "18:00:00",
                  };
                }
                if (
                  compareDatesByDayMonthYear(date, leaveRequest?.startDate) ===
                    1 &&
                  compareDatesByDayMonthYear(leaveRequest?.endDate, date) === 0
                ) {
                  return {
                    leaveType: leaveRequest.leaveType,
                    startTime: "09:00:00",
                    endTime: leaveRequest?.endDate
                      ?.toTimeString()
                      .split(" ")[0],
                  };
                }
              });
            let late = 0;
            let early = 0;
            let working_hours = 0;
            if (times.length > 0) {
              late = calculateMinutesBetweenTimes("09:00:00", times[0]);
              early = calculateMinutesBetweenTimes(
                times[times.length - 1],
                "18:00:00"
              );
              working_hours =
                calculateMinutesBetweenTimes(
                  times[0],
                  times[times.length - 1]
                ) / 60;
              const checkIn = new Date(`${dayString} ${times[0]}`);
              const checkOut = new Date(
                `${dayString} ${times[times.length - 1]}`
              );
              const lunch = new Date(`${dayString} 12:00:00`);
              if (checkIn < lunch && checkOut > lunch) {
                working_hours -= 1;
              }
            }
            return {
              day: dayString.split("/")[1],
              isWeekend: day.isWeekend,
              working_hours: `${working_hours.toFixed(2)}h(${convertHoursToTime(
                working_hours
              )})`,
              times,
              checkIn: times.length > 0 ? times[0] : "",
              late: late <= 0 ? 0 : late.toFixed(0),
              checkOut: times.length > 0 ? times[times.length - 1] : "",
              early: early <= 0 ? 0 : early.toFixed(0),
              leaveEvents,
            };
          });

          return {
            ...omit(item, ["leaveRequests"]),
            timeSheet,
          };
        }
      });

      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count,
        employees: formatData,
      };
      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize()
  @Get("/approvers")
  public async getApprovers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { session } = res.locals;

      const roleRepository = dataSource.getRepository(Role);

      const approverRole: Role | null = await roleRepository
        .createQueryBuilder("roles")
        .andWhere("roles.name = :name", { name: "Approver" })
        .leftJoinAndSelect("roles.users", "users")
        .leftJoinAndSelect("users.employee", "employee", "employee.id != :id", {
          id: session.employeeId,
        })
        .getOne();

      res.locals.data = {
        approvers: approverRole?.users
          .filter((user: User) => user.employee)
          .map((user: User) =>
            pick(user.employee, ["id", "fullName", "photo"])
          ),
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize()
  @Get("/notification-group-members")
  public async getNotificationGroupMembers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { session } = res.locals;

      const userRepository = dataSource.getRepository(User);

      const notificationGroupMembers: User[] | [] = await userRepository
        .createQueryBuilder("users")
        .leftJoinAndSelect("users.employee", "employee")
        .getMany();

      res.locals.data = {
        members: notificationGroupMembers
          .filter((user: User) => user.employee)
          .map((user: User) =>
            pick(user.employee, ["id", "fullName", "photo"])
          ),
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.EMPLOYEE_MANAGEMENT, canRead: true },
  ])
  @Get("/:id")
  public async getEmployeeById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;
      const { session } = res.locals;
      const employeeRepository = dataSource.getRepository(Employee);

      const employee: Employee | null = await employeeRepository
        .createQueryBuilder("employee")
        .where("employee.id = :id", { id })
        .withDeleted()
        .innerJoin("employee.user", "user")
        .leftJoin("employee.position", "position")
        .leftJoin("user.roles", "currentRoles")
        .leftJoin("employee.departments", "employees_departments")
        .leftJoin("employees_departments.department", "departments")
        .leftJoinAndSelect(
          "employees_departments.employee",
          "managers",
          "employees_departments.isManager = true"
        )
        .select([
          "employee",
          "user",
          "currentRoles.id",
          "currentRoles.name",
          "currentRoles.description",
          "position.id",
          "position.name",
          "position.level",
          "position.salary",
          "position.parentId",
          "employees_departments",
          "departments.id",
          "departments.name",
          "departments.parentId",
          "departments.orderNumber",
          "managers",
        ])
        .getOne();

      if (!employee) {
        throw new NotFoundError("Employee is not found.");
      }

      // Check salary permission
      const canViewSalary = checkPermission(
        {
          permission: UserPermission.EMPLOYEE_MANAGEMENT,
          canViewSalary: true,
        },
        session.permissions
      );

      // Check benefit permission
      const canViewBenefit = checkPermission(
        {
          permission: UserPermission.EMPLOYEE_MANAGEMENT,
          canViewBenefit: true,
        },
        session.permissions
      );

      // Position Salary
      let position: any = employee?.position;
      if (employee.position) {
        position = canViewSalary
          ? { ...position, salary: decryptSalary(position.salary) }
          : omit(position, ["salary"]);
      }

      let responseData: any = {
        ...omit(employee, ["user", "departments"]),
        position,
        recommendedRoleIds: employee.recommendedRoleIds
          ? employee.recommendedRoleIds.split(",")
          : [],
        departments: employee.departments
          ? employee.departments.map((item: EmployeeDepartment) => {
              const temp = omit(item, ["employee"]);
              return {
                ...temp.department,
                employee_department_id: temp.id,
                isManager: temp.isManager,
              };
            })
          : [],
        user: omit(employee.user, [
          "hashPassword",
          "resetToken",
          "activeToken",
        ]),
      };

      // Employee salary
      if (!canViewSalary) {
        responseData = omit(responseData, [...salaryFields]);
      } else {
        responseData = {
          ...responseData,
          ...salaryFields.reduce((acc: any, key: string) => {
            if (responseData[key]) {
              acc[key] = decryptSalary(responseData[key]);
            }
            return acc;
          }, {}),
        };
      }

      // Employee benefit
      if (!canViewBenefit) {
        responseData = omit(responseData, [...benefitFields]);
      } else {
        responseData = {
          ...responseData,
          ...benefitFields.reduce((acc: any, key: string) => {
            if (responseData[key]) {
              acc[key] = decryptSalary(responseData[key]);
            }
            return acc;
          }, {}),
        };
      }

      res.locals.data = {
        employee: responseData,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/")
  @Authorize([
    { permission: UserPermission.EMPLOYEE_MANAGEMENT, canCreate: true },
  ])
  public async add(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource, nodeMailer } = req.app.locals;
      const { session } = res.locals;
      const employeeRepository = dataSource.getRepository(Employee);
      const userRepository = dataSource.getRepository(User);
      const departmentRepository = dataSource.getRepository(Department);
      const positionRepository = dataSource.getRepository(Position);
      const roleRepository = dataSource.getRepository(Role);
      const employeeChildrenRepository =
        dataSource.getRepository(EmployeeChildren);
      const employeeDepartmentRepository =
        dataSource.getRepository(EmployeeDepartment);

      const {
        fullName,
        email,
        departmentIds,
        positionId,
        photo,
        children,
        recommendedRoleIds,
        joinDate,
      } = req.body;

      let user = await userRepository.findOneBy({
        email,
      });
      const employeeRole = await roleRepository.findOneBy({
        name: "Employee",
      });

      if (user) {
        //Check if the user has a relationship with an employee.
        const employee = await employeeRepository
          .createQueryBuilder("employee")
          .where("employee.user = :userId", { userId: user.id })
          .select()
          .getMany();

        if (employee.length !== 0) {
          throw new BadRequestError(
            "There is already an employee using this email"
          );
        }
      } else {
        //Create New User
        user = userRepository.create({
          email,
          createdBy: session.userId,
          displayName: fullName,
          status: UserStatus.PENDING,
          hashPassword: getHashPassword(
            new Date()
              .toISOString()
              .replace(/[-:T.]/g, "")
              .slice(0, 14)
          ),
          roles: [employeeRole as Role],
        });
        user = await userRepository.save(user);
        user.createdBy = session.userId;
      }

      // Create New Employee
      const employee = employeeRepository.create({
        fullName,
        photo,
        user,
        joinDate: joinDate || undefined,
        recommendedRoleIds: (recommendedRoleIds ?? []).join(","),
        position: positionId,
        createdBy: session.userId,
      });
      await employeeRepository.save(employee);

      //Get department by id
      let departments: Department[] | [] = [];
      if (departmentIds && departmentIds.length > 0) {
        departments = await departmentRepository.find({
          where: {
            id: In(departmentIds),
          },
        });
        // Create New EmployeeDepartment
        const employeeDepartments = departments.map(
          (department: Department) => {
            const employeeDepartment = employeeDepartmentRepository.create({
              employee: employee as Employee,
              department: department,
            });
            return employeeDepartment;
          }
        );
        await employeeDepartmentRepository.save(employeeDepartments);
      }
      //Get position information
      let position: Position | null = null;
      if (positionId) {
        position = await positionRepository.findOneBy({
          id: positionId,
        });
      }

      // Save children information
      if (children) {
        const childrenData = children.map((child: EmployeeChildren) => {
          return employeeChildrenRepository.create({
            employee,
            name: child.name,
            dob: child.dob,
          });
        });
        await employeeChildrenRepository.save(childrenData);
        employee.children = [...childrenData];
      }
      if (recommendedRoleIds) {
        const adminRole: Role | null = await roleRepository.findOne({
          relations: ["users"],
          where: { name: "Administrator" },
        });

        const admins: User[] | undefined = adminRole?.users;

        const urlSetRole = `${config.clientSite}/users/${
          user.id
        }?roles=${recommendedRoleIds.join("|")}`;

        sendMail({
          nodeMailer,
          emails: admins!.map((admin: User) => admin.email).join(","),
          template: "RecommendedRoles",
          data: {
            subject: "[WATA-SOFTWARE] Set recommended roles for employee",
            urlSetRole,
          },
        });
      }

      res.locals.message =
        "Create successfully. Please check your email to set password";
      res.locals.data = {
        employee: {
          ...omit(employee, ["user", "departments"]),
          recommendedRoleIds: employee.recommendedRoleIds
            ? employee.recommendedRoleIds.split(",")
            : [],
          department: departments
            ? departments.map((department: Department) => ({
                id: department.id,
                name: department.name,
              }))
            : null,
          position: position
            ? pick(position as Position, ["id", "name"])
            : null,
          children: employee?.children
            ? employee.children.map((child: EmployeeChildren) =>
                omit(child, ["employee"])
              )
            : [],
          user: omit(employee.user, [
            "hashPassword",
            "resetToken",
            "activeToken",
          ]),
        },
      };
      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/onboarding/email")
  @Authorize([
    { permission: UserPermission.EMPLOYEE_MANAGEMENT, canSendEmail: true },
  ])
  public async sendOnBoardingEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource, nodeMailer } = req.app.locals;
      const { userIds } = req.body;
      const userRepository = dataSource.getRepository(User);
      if (!Array.isArray(userIds)) {
        throw new BadRequestError("EmployeeIds must be an array");
      } else {
        const users = await userRepository.find({
          where: {
            id: In(userIds),
          },
        });
        if (users.length === 0) {
          throw new NotFoundError("Users are not found");
        }
        if (users.length !== 0 && users.length !== userIds.length) {
          throw new NotFoundError("Some users are not found.");
        }
        await Promise.all(
          users.map(async (user: User) => {
            //Set Reset Token
            const resetToken = generateUniqueString();
            userRepository.merge(user, {
              resetToken,
            });
            await userRepository.save(user);
            // TODO: send mail
            const urlActive = `${config.clientSite}/auth/new-password/${user.resetToken}`;
            return sendMail({
              nodeMailer,
              emails: user.email,
              template: "NewPassword",
              data: {
                subject: "[ERP] Account was created for you",
                email: user.email,
                urlReset: urlActive,
              },
            });
          })
        );
      }

      res.locals.message = "Email sent successfully";
      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id")
  @Authorize([
    { permission: UserPermission.EMPLOYEE_MANAGEMENT, canUpdate: true },
  ])
  public async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { session } = res.locals;
      const { dataSource, nodeMailer } = req.app.locals;
      let employeeInfo = req.body;

      employeeInfo = removeEmptyValues(employeeInfo);

      const {
        employeeCode,
        corporateId,
        fingerprintId,
        email,
        photo,
        status,
        positionId,
        departmentIds,
        recommendedRoleIds,
        vneIDNo,
        pitNo,
        siNo,
        personalCV,
        companyCV,
        vneIDCardFront,
        vneIDCardBack,
        children,
      } = employeeInfo;

      const salaryInfo = salaryFields.reduce((acc: any, key: string) => {
        if (employeeInfo[key]) {
          acc[key] = encryptSalary(Number(employeeInfo[key]));
        }
        return acc;
      }, {});

      const benefitInfo = benefitFields.reduce((acc: any, key: string) => {
        if (employeeInfo[key]) {
          acc[key] = encryptSalary(Number(employeeInfo[key]));
        }
        return acc;
      }, {});

      const userRepository = dataSource.getRepository(User);
      const employeeRepository = dataSource.getRepository(Employee);
      const departmentRepository = dataSource.getRepository(Department);
      const positionRepository = dataSource.getRepository(Position);
      const employeeDepartmentRepository =
        dataSource.getRepository(EmployeeDepartment);
      const employeeChildrenRepository =
        dataSource.getRepository(EmployeeChildren);
      const corporateRepository = dataSource.getRepository(Company);
      const roleRepository = dataSource.getRepository(Role);

      const employee: Employee | null = await employeeRepository.findOne({
        relations: [
          "user",
          "position",
          "departments",
          "departments.department",
          "children",
        ],
        where: { id },
      });
      if (!employee) {
        throw new NotFoundError("Employee is not found.");
      }

      if (vneIDNo) {
        const employeesExist: Employee[] = await employeeRepository.find({
          where: {
            id: Not(id),
            resignDate: IsNull(),
            vneIDNo,
          },
        });
        if (employeesExist.length > 0) {
          throw new NotAcceptableError("Duplicate ID No. Please check again.");
        }
      }

      if (pitNo) {
        const employeesExist: Employee[] = await employeeRepository.find({
          where: {
            id: Not(id),
            resignDate: IsNull(),
            pitNo: pitNo,
          },
        });
        if (employeesExist.length > 0) {
          throw new NotAcceptableError("Duplicate PIT No. Please check again.");
        }
      }

      if (siNo) {
        const employeesExist: Employee[] = await employeeRepository.find({
          where: {
            id: Not(id),
            resignDate: IsNull(),
            siNo,
          },
        });
        if (employeesExist.length > 0) {
          throw new NotAcceptableError("Duplicate SI No. Please check again.");
        }
      }

      const user: User = employee.user;

      if (email) {
        const emailExist = await userRepository.findOneBy({
          email,
          id: Not(user.id),
        });
        if (emailExist) {
          throw new NotAcceptableError("Email already in use.");
        }
      }

      if (employeeCode) {
        const employeeCodeExist = await employeeRepository.findOne({
          withDeleted: true,
          where: {
            employeeCode,
            id: Not(id),
          },
        });
        if (employeeCodeExist) {
          throw new NotAcceptableError("Employee Code already in use.");
        }
      }
      if (fingerprintId) {
        const employeeCodeExist = await employeeRepository.findOne({
          withDeleted: true,
          where: {
            fingerprintId,
            id: Not(id),
          },
        });
        if (employeeCodeExist) {
          throw new NotAcceptableError("Fingerprint ID already in use.");
        }
      }

      if (positionId) {
        const position: Position | null = await positionRepository.findOneBy({
          id: positionId,
        });
        if (!position) {
          throw new NotFoundError("Position is not found.");
        }

        employee.position = position;
      }

      if (corporateId) {
        const corporate: Company | null = await corporateRepository
          .createQueryBuilder("company")
          .where("id = :id", { id: corporateId })
          .getOne();
        if (!corporate) {
          throw new NotFoundError("Corporate is not found.");
        }
        employee.corporate = corporate;
      }

      if (photo) {
        if (employee?.photo && employee.photo !== photo) {
          const fileName = employee?.photo.split("/").pop() as string;
          if (fs.existsSync(path.join(config.upload_image_dir, fileName))) {
            fs.unlinkSync(path.join(config.upload_image_dir, fileName));
          }
        }
      }

      if (vneIDCardFront) {
        if (
          employee?.vneIDCardFront &&
          employee.vneIDCardFront !== vneIDCardFront
        ) {
          const fileName = employee?.vneIDCardFront.split("/").pop() as string;
          if (fs.existsSync(path.join(config.upload_image_dir, fileName))) {
            fs.unlinkSync(path.join(config.upload_image_dir, fileName));
          }
        }
      }

      if (vneIDCardBack) {
        if (
          employee?.vneIDCardBack &&
          employee.vneIDCardBack !== vneIDCardBack
        ) {
          const fileName = employee?.vneIDCardBack.split("/").pop() as string;
          if (fs.existsSync(path.join(config.upload_image_dir, fileName))) {
            fs.unlinkSync(path.join(config.upload_image_dir, fileName));
          }
        }
      }

      if (personalCV) {
        if (employee?.personalCV && employee.personalCV !== personalCV) {
          const fileName = employee?.personalCV.split("/").pop() as string;
          if (fs.existsSync(path.join(config.upload_pdf_dir, fileName))) {
            fs.unlinkSync(path.join(config.upload_pdf_dir, fileName));
          }
        }
      }
      if (companyCV) {
        if (employee?.companyCV && employee.companyCV !== companyCV) {
          const fileName = employee?.companyCV.split("/").pop() as string;
          if (fs.existsSync(path.join(config.upload_pdf_dir, fileName))) {
            fs.unlinkSync(path.join(config.upload_pdf_dir, fileName));
          }
        }
      }

      if (departmentIds && departmentIds?.length > 0) {
        // Fetch the new departments
        const departments: Department[] | [] = await departmentRepository.find({
          where: {
            id: In(departmentIds),
          },
        });

        if (
          departments.length === 0 ||
          departments.length < departmentIds.length
        ) {
          throw new NotFoundError("Department is not found.");
        }

        // Delete all existed employee department
        await employeeDepartmentRepository
          .createQueryBuilder()
          .delete()
          .from(EmployeeDepartment)
          .where("employeeId = :id", { id })
          .execute();

        // Create New EmployeeDepartment
        const employeeDepartments = departments.map(
          (department: Department) => {
            const employeeDepartment = employeeDepartmentRepository.create({
              employee: employee,
              department: department,
            });
            return employeeDepartment;
          }
        );
        await employeeDepartmentRepository.save(employeeDepartments);
        employee.departments = employeeDepartments;
      }

      if (departmentIds === null || departmentIds?.length === 0) {
        //Delete employee department if departmentId is null or departmentIds is empty
        employee.departments = [];
        await employeeDepartmentRepository
          .createQueryBuilder()
          .delete()
          .from(EmployeeDepartment)
          .where("employeeId = :id", { id })
          .execute();
      }

      if (children) {
        const employeeChildren = await employeeChildrenRepository.find({
          where: {
            employee: {
              id,
            },
          },
        });
        if (employeeChildren.length > 0) {
          await employeeChildrenRepository.delete(
            employeeChildren.map((item: EmployeeChildren) => item.id)
          );
        }
        const childrenData = children.map((child: EmployeeChildren) => {
          return employeeChildrenRepository.create({
            employee,
            name: child.name,
            dob: child.dob,
          });
        });
        await employeeChildrenRepository.save(childrenData);

        employee.children = [...childrenData];
      }

      userRepository.merge(user, {
        email,
        status,
      });

      employeeRepository.merge(employee as Employee, {
        ...omit(employeeInfo, [
          "recommendedRoleIds",
          ...salaryFields,
          ...benefitFields,
        ]),
        ...(recommendedRoleIds && {
          recommendedRoleIds: recommendedRoleIds.join(","),
        }),
      });

      // Check salary permission
      const canEditSalary = checkPermission(
        {
          permission: UserPermission.EMPLOYEE_MANAGEMENT,
          canEditSalary: true,
        },
        session.permissions
      );

      // Check benefit permission
      const canEditBenefit = checkPermission(
        {
          permission: UserPermission.EMPLOYEE_MANAGEMENT,
          canEditBenefit: true,
        },
        session.permissions
      );

      if (canEditSalary) {
        employeeRepository.merge(employee as Employee, {
          ...salaryInfo,
        });
      }

      if (canEditBenefit) {
        employeeRepository.merge(employee as Employee, {
          ...benefitInfo,
        });
      }

      const [a, b] = await Promise.all([
        userRepository.save(user),
        employeeRepository.save(employee),
      ]);

      // Position Salary
      let position: any = employee?.position;
      if (employee.position) {
        position = canEditSalary
          ? { ...position, salary: decryptSalary(position.salary) }
          : omit(position, ["salary"]);
      }

      let responseData: any = {
        ...omit(employee, ["user", "departments", "corporate"]),
        position,
        departments: employee.departments
          ? employee.departments.map((item: EmployeeDepartment) => {
              const temp = omit(item, ["employee"]);
              return {
                ...temp.department,
                employee_department_id: temp.id,
                isManager: temp.isManager,
              };
            })
          : [],
        corporate: employee.corporate
          ? pick(employee?.corporate, [
              "id",
              "name",
              "email",
              "phone",
              "address",
              "logo",
            ])
          : null,
        children: employee.children
          ? employee.children
              .filter((item: EmployeeChildren) => item.id)
              .map((child: EmployeeChildren) => {
                return {
                  id: child.id,
                  name: child.name,
                  dob: child.dob,
                };
              })
          : [],
        recommendedRoleIds: employee.recommendedRoleIds
          ? employee.recommendedRoleIds.split(",")
          : [],
        user: omit(employee.user, [
          "hashPassword",
          "resetToken",
          "activeToken",
        ]),
      };

      const tempEmployee: any = employee as Employee;

      // Employee salary
      if (!canEditSalary) {
        responseData = omit(responseData, [...salaryFields]);
      } else {
        responseData = {
          ...responseData,
          ...salaryFields.reduce((acc: any, key: string) => {
            if (tempEmployee[key]) {
              acc[key] = decryptSalary(tempEmployee[key]);
            }
            return acc;
          }, {}),
        };
      }

      // Employee benefit
      if (!canEditBenefit) {
        responseData = omit(responseData, [...benefitFields]);
      } else {
        responseData = {
          ...responseData,
          ...benefitFields.reduce((acc: any, key: string) => {
            if (tempEmployee[key]) {
              acc[key] = decryptSalary(tempEmployee[key]);
            }
            return acc;
          }, {}),
        };
      }

      if (recommendedRoleIds) {
        const adminRole: Role | null = await roleRepository.findOne({
          relations: ["users"],
          where: { name: "Administrator" },
        });

        const admins: User[] | undefined = adminRole?.users;

        const urlSetRole = `${config.clientSite}/users/${
          user.id
        }?roles=${recommendedRoleIds.join("|")}`;

        sendMail({
          nodeMailer,
          emails: admins!.map((admin: User) => admin.email).join(","),
          template: "RecommendedRoles",
          data: {
            subject: "[WATA-SOFTWARE] Set recommended roles for employee",
            urlSetRole,
          },
        });
      }

      res.locals.message = "Updated employee successfully";

      res.locals.data = {
        employee: responseData,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id/permanently")
  @Authorize([
    {
      permission: UserPermission.EMPLOYEE_MANAGEMENT,
      canPermanentlyDelete: true,
    },
  ])
  public async hardDelete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;

      const employeeRepository = dataSource.getRepository(Employee);
      const contractRepository = dataSource.getRepository(Contract);
      const employeeDepartmentRepository =
        dataSource.getRepository(EmployeeDepartment);
      const leaveRequestRepository = dataSource.getRepository(LeaveRequest);

      const employee: Employee | null = await employeeRepository
        .createQueryBuilder("employee")
        .withDeleted()
        .where("employee.id = :id", { id })
        .andWhere("employee.deletedAt IS NOT NULL")
        .getOne();
      if (!employee) {
        throw new NotFoundError("Employee is not found.");
      }

      const contracts: Contract[] = await contractRepository
        .createQueryBuilder("contracts")
        .where("contracts.employeeId = :id", { id })
        .getMany();
      if (contracts) {
        await contractRepository.remove(contracts);
      }

      const employeesDepartments: EmployeeDepartment[] =
        await employeeDepartmentRepository
          .createQueryBuilder("employees_departments")
          .where("employees_departments.employeeId = :id", { id })
          .getMany();
      if (employeesDepartments) {
        await employeeDepartmentRepository.remove(employeesDepartments);
      }

      const leaveRequests: LeaveRequest[] = await leaveRequestRepository
        .createQueryBuilder("leave_requests")
        .where("leave_requests.employeeId = :id", { id })
        .getMany();
      if (leaveRequests) {
        await leaveRequestRepository.remove(leaveRequests);
      }

      const leaveRequestsApproval: LeaveRequest[] = await leaveRequestRepository
        .createQueryBuilder("leave_requests")
        .where("leave_requests.approverId = :id", { id })
        .getMany();
      if (leaveRequestsApproval.length > 0) {
        throw new NotAcceptableError(
          "Can not delete this Employee because this employee is an approver of some leave requests."
        );
      }

      await employeeRepository.delete(employee.id);

      res.locals.message = "Employee successfully deleted permanently.";

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id")
  @Authorize([
    { permission: UserPermission.EMPLOYEE_MANAGEMENT, canDelete: true },
  ])
  public async softDelete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;

      const employeeRepository = dataSource.getRepository(Employee);
      const employee = await employeeRepository.findOneBy({ id });

      if (!employee) {
        throw new NotFoundError("Employee is not found.");
      }

      if (employee.createdBy === "migration") {
        throw new ForbiddenError("Can not delete this Employee.");
      }

      await employeeRepository.softDelete({ id });

      res.locals.message = "Deleted employee successfully";

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.EMPLOYEE_MANAGEMENT, canImport: true },
  ])
  @Post("/upload-excel")
  public async uploadExcelFile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource, nodeMailer } = req.app.locals;
      const { session } = res.locals;
      const employeeRepository = dataSource.getRepository(Employee);
      const departmentRepository = dataSource.getRepository(Department);
      const employeeDepartmentRepository =
        dataSource.getRepository(EmployeeDepartment);
      const positionRepository = dataSource.getRepository(Position);
      const companyRepository = dataSource.getRepository(Company);
      const userRepository = dataSource.getRepository(User);
      const roleRepository = dataSource.getRepository(Role);
      const contractRepository = dataSource.getRepository(Contract);
      const educationRepository = dataSource.getRepository(Education);
      const degreeRepository = dataSource.getRepository(Degree);
      const employeeChildrenRepository =
        dataSource.getRepository(EmployeeChildren);
      const leaveTypeRepository = dataSource.getRepository(LeaveType);
      const remainingAnnualLeaveRepository =
        dataSource.getRepository(RemainingAnnualLeave);
      const files: any[] = await handleUploadExcel(req);
      const excelFilePath = files[0]?.filepath;

      const employeeRole = await roleRepository.findOneBy({
        name: "Employee",
      });
      try {
        const workbook = xlsx.readFile(excelFilePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Define the expected headers
        const expectedHeaders = [
          "employeeCode",
          "employeeName",
          "joinDate",
          "corporate",
          "department",
          "position",
          "level",
          "gender",
          "dateOfBirth",
          "placeOfBirth",
          "phoneNumber",
          "email",
          "personalEmail",
          "homeTown",
          "vneIDNo",
          "vneIDDate",
          "vneIDPlace",
          "school",
          "degree",
          "major",
          "fromYear",
          "toYear",
          "pit",
          "si",
          "bankAccount",
          "bankName",
          "permanentAddress",
          "contactAddress",
          "maritalStatus",
          "firstChildName",
          "firstChildDob",
          "secondChildName",
          "secondChildDob",
          "ecRelationship",
          "ecName",
          "ecPhoneNumber",
          "notes",
          "contractNumber",
          "contractType",
          "workingType",
          "contractStartDate",
          "contractEndDate",
          "isRemote",
        ];

        let results: EmployeeInfoFromFile[] = xlsx.utils
          .sheet_to_json(worksheet, {
            header: expectedHeaders,
            range: 1, // Skip the header row
            raw: false,
            defval: "",
            dateNF: "yyyy-mm-dd",
          })
          .map((employee: any) => {
            return new EmployeeInfoFromFile({
              ...employee,
            });
          });

        // Clean up the temp file after processing
        fs.unlink(excelFilePath, (unlinkErr) => {
          if (unlinkErr) {
            return next(unlinkErr);
          }
        });

        const isValid = results.every(
          (employee: EmployeeInfoFromFile) =>
            results.filter(
              (e: EmployeeInfoFromFile) => e.vneIDNo === employee.vneIDNo
            ).length === 1
        );

        const isContractNumberValid = results.every(
          (employee: EmployeeInfoFromFile) =>
            results.filter(
              (e: EmployeeInfoFromFile) =>
                e.contractNumber === employee.contractNumber
            ).length === 1
        );
        const isEmployeeCodeValid = results.every(
          (employee: EmployeeInfoFromFile) =>
            results.filter(
              (e: EmployeeInfoFromFile) =>
                e.employeeCode === employee.employeeCode
            ).length === 1
        );

        if (!isEmployeeCodeValid) {
          throw new NotAcceptableError("Duplicate Employee Code in File.");
        }

        if (!isValid) {
          throw new NotAcceptableError(
            "Duplicate ID No in File. Please check again."
          );
        }

        if (!isContractNumberValid) {
          throw new NotAcceptableError(
            "Duplicate Contract Number in File. Please check again."
          );
        }
        for (let i = 0; i < results.length; i++) {
          if (!results[i].employeeCode) {
            return next(
              new NotAcceptableError(
                `Line ${i + 1}: Employee code is required. Please check again`
              )
            );
          }
          if (results[i].employeeCode) {
            const employeeExist: Employee | null =
              await employeeRepository.findOne({
                where: {
                  employeeCode: results[i].employeeCode,
                },
                withDeleted: true,
              });
            if (employeeExist) {
              return next(
                new NotAcceptableError(
                  `Line ${
                    i + 1
                  }: Contains a duplicate Employee Code in the system. Please check again.`
                )
              );
            }
          }
          if (!results[i].employeeName) {
            return next(
              new NotAcceptableError(
                `Line ${i + 1}: Employee name is required. Please check again.`
              )
            );
          }
          if (!results[i].email) {
            return next(
              new NotAcceptableError(
                `Line ${i + 1}: Email is required. Please check again.`
              )
            );
          }
          if (results[i].email) {
            const userExist: User | null = await userRepository.findOne({
              where: {
                email: results[i].email,
              },
              withDeleted: true,
            });
            if (userExist) {
              return next(
                new NotAcceptableError(
                  `Line ${
                    i + 1
                  }: Contains a duplicate Email in the system. Please check again.`
                )
              );
            }
          }
          if (!results[i].dateOfBirth) {
            return next(
              new BadRequestError(
                `Line ${i + 1}: Date of birth is required. Please check again.`
              )
            );
          }
          if (results[i].vneIDNo) {
            const employeesExist: Employee[] = await employeeRepository.find({
              where: { resignDate: IsNull(), vneIDNo: results[i].vneIDNo },
            });
            if (employeesExist.length > 0) {
              return next(
                new NotAcceptableError(
                  `Line ${
                    i + 1
                  }: Contains a duplicate ID No with an existing employee in the system. Please check again.`
                )
              );
            }
          }
          if (results[i].corporate) {
            const companyExist = await companyRepository.findOneBy({
              name: results[i].corporate,
            });
            if (!companyExist) {
              return next(
                new NotAcceptableError(
                  `Line ${
                    i + 1
                  }: Corporate does not exist in the system. Please check again.`
                )
              );
            }
          }
          if (results[i].department) {
            const departmentExist = await departmentRepository.findOneBy({
              name: results[i].department,
            });
            if (!departmentExist) {
              return next(
                new NotAcceptableError(
                  `Line ${
                    i + 1
                  }: Department does not exist in the system. Please check again.`
                )
              );
            }
          }
          if (results[i].position) {
            const positionExist = await positionRepository.findOne({
              where: {
                name: results[i].position,
              },
            });
            if (!positionExist) {
              return next(
                new NotAcceptableError(
                  `Line ${
                    i + 1
                  }: Position does not exist in the system. Please check again`
                )
              );
            }
          }
          if (results[i].position && results[i].level) {
            const positionExist = await positionRepository.findOneBy({
              name: results[i].position,
              level: results[i].level,
            });
            if (!positionExist) {
              return next(
                new NotAcceptableError(
                  `Line ${
                    i + 1
                  }: Position and Level do not match. Please check again`
                )
              );
            }
          }
          if (!results[i].position && results[i].level) {
            return next(
              new NotAcceptableError(
                `Line ${
                  i + 1
                }: Position is required when Level is provided. Please check again`
              )
            );
          }
          if (
            !results[i].school ||
            !results[i].degree ||
            !results[i].major ||
            !results[i].fromYear ||
            !results[i].toYear
          ) {
            return next(
              new NotAcceptableError(
                `Line ${
                  i + 1
                }: Education information is required. Please check again.`
              )
            );
          }
          if (results[i].degree) {
            const degreeExist = await degreeRepository.findOneBy({
              name: results[i].degree,
            });
            if (!degreeExist) {
              return next(
                new NotAcceptableError(
                  `Line ${
                    i + 1
                  }: Degree does not exist in the system. Please check again.`
                )
              );
            }
          }

          if (results[i].firstChildName && !results[i].firstChildDob) {
            return next(
              new NotAcceptableError(
                `Line ${
                  i + 1
                }: First child's Date of Birth is required. Please check again.`
              )
            );
          }
          if (!results[i].firstChildName && results[i].firstChildDob) {
            return next(
              new NotAcceptableError(
                `Line ${
                  i + 1
                }: First child's Name is required. Please check again.`
              )
            );
          }
          if (!results[i].secondChildName && results[i].secondChildDob) {
            return next(
              new NotAcceptableError(
                `Line ${
                  i + 1
                }: Second child's Name is required. Please check again.`
              )
            );
          }
          if (results[i].secondChildName && !results[i].secondChildDob) {
            return next(
              new NotAcceptableError(
                `Line ${
                  i + 1
                }: Second child's Date of Birth is required. Please check again.`
              )
            );
          }

          if (
            !results[i].contractNumber ||
            !results[i].contractType ||
            !results[i].workingType ||
            !results[i].contractStartDate ||
            !results[i].contractEndDate
          ) {
            return next(
              new NotAcceptableError(
                `Line ${
                  i + 1
                }: Contract information is required. Please check again.`
              )
            );
          }
          if (results[i].contractNumber) {
            const contractNumberExist: Contract | null =
              await contractRepository.findOneBy({
                no: results[i].contractNumber,
              });
            if (contractNumberExist) {
              return next(
                new NotAcceptableError(
                  `Line ${
                    i + 1
                  }: Contains a duplicate Contract Number in the system. Please check again.`
                )
              );
            }
          }
        }
        ///// Insert Data to Database
        const errorRows: any[] = [];
        // Filter soft delete user
        results = (
          await Promise.all(
            results.map(async (item: EmployeeInfoFromFile, index: number) => {
              const user: User | null = await userRepository
                .createQueryBuilder("user")
                .withDeleted()
                .where("user.email = :email", { email: item.email })
                .getOne();

              if (user) {
                errorRows.push({
                  row: index + 2,
                  email: item.email,
                });
                return null; // return null or any falsy value to exclude this item later
              }

              return item; // return the item if the user doesn't exist
            })
          )
        ).filter((item) => item !== null) as EmployeeInfoFromFile[];

        //Map parsed data to User entity instances
        const users: User[] = results.map((item: EmployeeInfoFromFile) => {
          // // TODO: send mail to active account
          const user = new User();
          user.displayName = item.employeeName;
          user.email = item.email;
          user.hashPassword = getHashPassword(generateUniqueString());
          user.createdBy = session.userId;
          user.roles = [employeeRole as Role];
          return user;
        });

        //Create New User
        const newUsers = await userRepository.save(users);
        try {
          //Map parsed data to Employee entity instances
          await Promise.all(
            results.map(async (item: EmployeeInfoFromFile, index: number) => {
              try {
                // Fetch company and position concurrently
                const [employeeCorporate, position] = await Promise.all([
                  companyRepository.findOneBy({ name: item.corporate }),
                  positionRepository.findOneBy({
                    name: item.position,
                    level: item.level,
                  }),
                ]);

                // Create and save employee
                const employee = employeeRepository.create({
                  createdBy: session.userId,
                  user: newUsers[index],
                  photo: "",
                  fullName: item.employeeName,
                  employeeCode: item.employeeCode,
                  joinDate: item.joinDate,
                  corporate: employeeCorporate || undefined,
                  position: position || undefined,
                  gender: item.gender,
                  dateOfBirth: item.dateOfBirth,
                  placeOfBirth: item.placeOfBirth,
                  phoneNumber: item.phoneNumber,
                  personalEmail: item.personalEmail,
                  homeTown: item.homeTown,
                  vneIDNo: item.vneIDNo,
                  vneIDDate: item.vneIDDate,
                  vneIDPlace: item.vneIDPlace,
                  pitNo: item.pit,
                  siNo: item.si,
                  bankAccountName: clearSignAndUppercase(item.employeeName),
                  bankName: item.bankName,
                  bankAccountNumber: item.bankAccount,
                  permanentAddress: item.permanentAddress,
                  contactAddress: item.contactAddress,
                  maritalStatus: item.maritalStatus,
                  ecRelationship: item.ecRelationship,
                  ecName: item.ecName,
                  ecPhoneNumber: item.ecPhoneNumber,
                  notes: item.notes,
                });
                await employeeRepository.save(employee);

                // Children
                let children: EmployeeChildren[] = [];
                if (item.firstChildName && item.firstChildDob) {
                  const firstChild = employeeChildrenRepository.create({
                    name: item.firstChildName,
                    dob: item.firstChildDob,
                  });
                  await employeeChildrenRepository.save(firstChild);

                  children.push(firstChild);
                }
                if (item.secondChildName && item.secondChildDob) {
                  const secondChild = employeeChildrenRepository.create({
                    name: item.secondChildName,
                    dob: item.secondChildDob,
                  });
                  await employeeChildrenRepository.save(secondChild);

                  children.push(secondChild);
                }
                employee.children = [...children];
                await employeeRepository.save(employee);

                // Save department if exists
                if (item.department) {
                  const department = await departmentRepository.findOneBy({
                    name: item.department,
                  });
                  if (department) {
                    const employeeDepartment =
                      employeeDepartmentRepository.create({
                        employee,
                        department,
                      });
                    await employeeDepartmentRepository.save(employeeDepartment);
                  }
                }

                // Save contract
                const contract = contractRepository.create({
                  employee,
                  createdBy: session.userId,
                  no: item.contractNumber,
                  contractType: item.contractType,
                  workingType: item.workingType,
                  startDate: item.contractStartDate,
                  endDate: item.contractEndDate,
                  isRemote: item.isRemote,
                  status: ContractStatus.ACTIVE,
                });
                await contractRepository.save(contract);

                // Save education
                const degree = await degreeRepository.findOneBy({
                  name: item.degree,
                });
                if (degree) {
                  const education = educationRepository.create({
                    degree,
                    fromYear: item.fromYear,
                    toYear: item.toYear,
                    school: item.school,
                    major: item.major,
                  });
                  education.employee = employee;

                  await educationRepository.save(education);
                }

                // Initial Annual Leave
                const annualLeaveType: LeaveType | null =
                  await leaveTypeRepository.findOne({
                    where: { name: "Annual leave" },
                  });

                const remainingAnnualLeave =
                  remainingAnnualLeaveRepository.create({
                    employee,
                    quantity: 0,
                    status:
                      item.contractType !== ContractTypes.PROBATION
                        ? RemainingAnnualLeaveStatus.ACTIVE
                        : RemainingAnnualLeaveStatus.DISABLED,
                    year: new Date().getFullYear().toString(),
                    leaveType: annualLeaveType!,
                    calculationDate: employee.joinDate,
                  });
                await remainingAnnualLeaveRepository.save(remainingAnnualLeave);
              } catch (error) {
                throw new Error(
                  `Error processing employee ${item.employeeName}: ${error}`
                );
              }
            })
          );

          // Notify if there are any errors with
          if (errorRows.length > 0) {
            res.locals.message =
              "Some employees were not added because their email already exists";
            res.locals.data = {
              rowsNotAdded: errorRows.sort((a, b) => a - b),
            };
          } else {
            // // Insert data into the database
            res.locals.message = "Imported employees successfully";
          }
          next();
        } catch (error) {
          //Removed Inserted User if Insert employee has failed
          await userRepository.remove(newUsers);
          next(error);
        }
      } catch (parseErr) {
        next(parseErr);
      }
      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.EMPLOYEE_MANAGEMENT, canImport: true },
  ])
  @Post("/upload-csv")
  public async uploadCsvFile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { session } = res.locals;
      const employeeRepository = dataSource.getRepository(Employee);
      const userRepository = dataSource.getRepository(User);
      const roleRepository = dataSource.getRepository(Role);
      const companyRepository = dataSource.getRepository(Company);
      const contractRepository = dataSource.getRepository(Contract);
      const educationRepository = dataSource.getRepository(Education);
      const degreeRepository = dataSource.getRepository(Degree);
      const departmentRepository = dataSource.getRepository(Department);
      const employeeDepartmentRepository =
        dataSource.getRepository(EmployeeDepartment);
      const positionRepository = dataSource.getRepository(Position);
      const employeeChildrenRepository =
        dataSource.getRepository(EmployeeChildren);
      const leaveTypeRepository = dataSource.getRepository(LeaveType);
      const remainingAnnualLeaveRepository =
        dataSource.getRepository(RemainingAnnualLeave);
      const employeeRole = await roleRepository.findOneBy({
        name: "Employee",
      });

      const files: any[] = await handleUploadCSV(req);
      const csvFilePath = files[0].filepath;
      let results: EmployeeInfoFromFile[] = [];

      // Define the expected headers
      const expectedHeaders = [
        "employeeCode",
        "employeeName",
        "joinDate",
        "corporate",
        "department",
        "position",
        "level",
        "gender",
        "dateOfBirth",
        "placeOfBirth",
        "phoneNumber",
        "email",
        "personalEmail",
        "homeTown",
        "vneIDNo",
        "vneIDDate",
        "vneIDPlace",
        "school",
        "degree",
        "major",
        "fromYear",
        "toYear",
        "pit",
        "si",
        "bankAccount",
        "bankName",
        "permanentAddress",
        "contactAddress",
        "maritalStatus",
        "firstChildName",
        "firstChildDob",
        "secondChildName",
        "secondChildDob",
        "ecRelationship",
        "ecName",
        "ecPhoneNumber",
        "notes",
        "contractNumber",
        "contractType",
        "workingType",
        "contractStartDate",
        "contractEndDate",
        "isRemote",
      ];
      const fileStream = fs.createReadStream(csvFilePath, { encoding: "utf8" });
      const errors: Error[] = [];
      const errorRows: any[] = [];
      fileStream
        .pipe(
          csvParser({
            headers: expectedHeaders,
            skipLines: 1,
            strict: true,
          })
        )
        .on("data", (row: IEmployeeInfoFromFile) => {
          if (Object.values(row).some((value) => value.trim() !== "")) {
            const employee: EmployeeInfoFromFile = new EmployeeInfoFromFile(
              row
            );

            if (!employee.employeeCode) {
              errors.push(new BadRequestError("Employee code is required"));
            }
            if (!employee.employeeName) {
              errors.push(new BadRequestError("Employee name is required"));
            }
            if (!employee.email) {
              errors.push(new BadRequestError("Email is required"));
            }
            if (!employee.dateOfBirth) {
              errors.push(new BadRequestError("Date of birth is required"));
            }
            results.push(employee);
          }
        })
        .on("end", async () => {
          // Clean up the temp file after processing
          fs.unlink(csvFilePath, (unlinkErr) => {
            if (unlinkErr) {
              return next(unlinkErr);
            }
          });
          //Notify if there are any errors
          if (errors.length > 0) {
            return next(errors[0]);
          }
          for (let i = 0; i < results.length; i++) {
            if (results[i].vneIDNo) {
              const employeesExist: Employee[] = await employeeRepository.find({
                where: {
                  resignDate: IsNull(),
                  vneIDNo: results[i].vneIDNo,
                },
              });
              if (employeesExist.length > 0) {
                errors.push(
                  new NotAcceptableError(
                    `Line ${
                      i + 1
                    }: Contains a duplicate ID No with an existing employee in the system. Please check again.`
                  )
                );
              }
            }
            if (results[i].employeeCode) {
              const employeeExist: Employee | null =
                await employeeRepository.findOne({
                  where: {
                    employeeCode: results[i].employeeCode,
                  },
                  withDeleted: true,
                });

              if (employeeExist) {
                errors.push(
                  new NotAcceptableError(
                    `Line ${
                      i + 1
                    }: Contains a duplicate Employee Code in the system. Please check again.`
                  )
                );
              }
            }
            if (results[i].email) {
              const userExist: User | null = await userRepository.findOne({
                where: {
                  email: results[i].email,
                },
                withDeleted: true,
              });
              if (userExist) {
                return next(
                  new NotAcceptableError(
                    `Line ${
                      i + 1
                    }: Contains a duplicate Email in the system. Please check again.`
                  )
                );
              }
            }
            if (results[i].corporate) {
              const companyExist = await companyRepository.findOneBy({
                name: results[i].corporate,
              });
              if (!companyExist) {
                errors.push(
                  new NotAcceptableError(
                    `Line ${
                      i + 1
                    }: Corporate does not exist in the system. Please check again.`
                  )
                );
              }
            }
            if (results[i].department) {
              const departmentExist = await departmentRepository.findOneBy({
                name: results[i].department,
              });
              if (!departmentExist) {
                errors.push(
                  new NotAcceptableError(
                    `Line ${
                      i + 1
                    }: Department does not exist in the system. Please check again.`
                  )
                );
              }
            }
            if (results[i].position) {
              const positionExist = await positionRepository.findOne({
                where: {
                  name: results[i].position,
                },
              });
              if (!positionExist) {
                errors.push(
                  new NotAcceptableError(
                    `Line ${
                      i + 1
                    }: Position does not exist in the system. Please check again`
                  )
                );
              }
            }
            if (results[i].position && results[i].level) {
              const positionExist = await positionRepository.findOneBy({
                name: results[i].position,
                level: results[i].level,
              });
              if (!positionExist) {
                errors.push(
                  new NotAcceptableError(
                    `Line ${
                      i + 1
                    }: Position and Level do not match. Please check again`
                  )
                );
              }
            }
            if (!results[i].position && results[i].level) {
              errors.push(
                new NotAcceptableError(
                  `Line ${
                    i + 1
                  }: Position is required when Level is provided. Please check again`
                )
              );
            }
            if (
              !results[i].school ||
              !results[i].degree ||
              !results[i].major ||
              !results[i].fromYear ||
              !results[i].toYear
            ) {
              errors.push(
                new BadRequestError(
                  `Line ${
                    i + 1
                  }: Education information is required. Please check again.`
                )
              );
            }
            if (results[i].degree) {
              const degreeExist = await degreeRepository.findOneBy({
                name: results[i].degree,
              });
              if (!degreeExist) {
                errors.push(
                  new NotAcceptableError(
                    `Line ${
                      i + 1
                    }: Degree does not exist in the system. Please check again.`
                  )
                );
              }
            }

            if (results[i].firstChildName && !results[i].firstChildDob) {
              errors.push(
                new NotAcceptableError(
                  `Line ${
                    i + 1
                  }: First child's Date of Birth is required. Please check again.`
                )
              );
            }
            if (!results[i].firstChildName && results[i].firstChildDob) {
              errors.push(
                new NotAcceptableError(
                  `Line ${
                    i + 1
                  }: First child's Name is required. Please check again.`
                )
              );
            }
            if (!results[i].secondChildName && results[i].secondChildDob) {
              errors.push(
                new NotAcceptableError(
                  `Line ${
                    i + 1
                  }: Second child's Name is required. Please check again.`
                )
              );
            }
            if (results[i].secondChildName && !results[i].secondChildDob) {
              errors.push(
                new NotAcceptableError(
                  `Line ${
                    i + 1
                  }: Second child's Date of Birth is required. Please check again.`
                )
              );
            }

            if (
              !results[i].contractNumber ||
              !results[i].contractType ||
              !results[i].workingType ||
              !results[i].contractStartDate ||
              !results[i].contractEndDate
            ) {
              errors.push(
                new BadRequestError(
                  `Line ${
                    i + 1
                  }: Contract information is required. Please check again.`
                )
              );
            }
            if (results[i].contractNumber) {
              const contractNumberExist: Contract | null =
                await contractRepository.findOneBy({
                  no: results[i].contractNumber,
                });
              if (contractNumberExist) {
                errors.push(
                  new NotAcceptableError(
                    `Line ${
                      i + 1
                    }: Contains a duplicate Contract Number in the system. Please check again.`
                  )
                );
              }
            }
          }
          if (errors.length > 0) {
            return next(errors[0]);
          }
          const isContractNumberValid = results.every(
            (employee: EmployeeInfoFromFile) =>
              results.filter(
                (e: EmployeeInfoFromFile) =>
                  e.contractNumber === employee.contractNumber
              ).length === 1
          );
          const isEmployeeCodeValid = results.every(
            (employee: EmployeeInfoFromFile) =>
              results.filter(
                (e: EmployeeInfoFromFile) =>
                  e.employeeCode === employee.employeeCode
              ).length === 1
          );
          const isValid = results.every(
            (employee: EmployeeInfoFromFile) =>
              results.filter(
                (e: EmployeeInfoFromFile) => e.vneIDNo === employee.vneIDNo
              ).length === 1
          );
          if (!isEmployeeCodeValid) {
            return next(
              new NotAcceptableError(
                "Duplicate Employee Code in File. Please check again."
              )
            );
          }

          if (!isValid) {
            return next(
              new NotAcceptableError(
                "Duplicate ID No in File. Please check again."
              )
            );
          }

          if (!isContractNumberValid) {
            return next(
              new NotAcceptableError(
                "Duplicate Contract Number in File. Please check again."
              )
            );
          }

          try {
            ///// Insert Data to Database
            // Filter user has new email
            results = (
              await Promise.all(
                results.map(
                  async (item: EmployeeInfoFromFile, index: number) => {
                    const user: User | null = await userRepository
                      .createQueryBuilder("user")
                      .withDeleted()
                      .where("user.email = :email", { email: item.email })
                      .getOne();

                    if (user) {
                      errorRows.push({
                        row: index + 2,
                        email: item.email,
                      });
                      return null; // return null or any falsy value to exclude this item later
                    }

                    return item; // return the item if the user doesn't exist
                  }
                )
              )
            ).filter((item) => item !== null) as EmployeeInfoFromFile[];
            //Map parsed data to User entity instances
            const users: User[] = results.map((item: EmployeeInfoFromFile) => {
              // // TODO: send mail to active account
              const user = new User();
              user.displayName = item.employeeName;
              user.email = item.email;
              user.hashPassword = getHashPassword(generateUniqueString());
              user.createdBy = session.userId;
              user.roles = [employeeRole as Role];
              return user;
            });

            //Create New User
            const newUsers = await userRepository.save(users);
            try {
              //Map parsed data to Employee entity instances
              const employees: Employee[] = results.map(
                (item: EmployeeInfoFromFile, index: number) => {
                  const employee = employeeRepository.create({
                    createdBy: session.userId,
                    user: newUsers[index],
                    photo: "",
                    fullName: item.employeeName,
                    employeeCode: item.employeeCode,
                    joinDate: item.joinDate,
                    gender: item.gender,
                    dateOfBirth: item.dateOfBirth,
                    placeOfBirth: item.placeOfBirth,
                    phoneNumber: item.phoneNumber,
                    personalEmail: item.personalEmail,
                    homeTown: item.homeTown,
                    vneIDNo: item.vneIDNo,
                    vneIDDate: item.vneIDDate,
                    vneIDPlace: item.vneIDPlace,
                    pitNo: item.pit,
                    siNo: item.si,
                    bankAccountName: clearSignAndUppercase(item.employeeName),
                    bankName: item.bankName,
                    bankAccountNumber: item.bankAccount,
                    permanentAddress: item.permanentAddress,
                    contactAddress: item.contactAddress,
                    maritalStatus: item.maritalStatus,
                    ecRelationship: item.ecRelationship,
                    ecName: item.ecName,
                    ecPhoneNumber: item.ecPhoneNumber,
                    notes: item.notes,
                  });
                  return employee;
                }
              );
              const newEmployees = await employeeRepository.save(employees);

              await Promise.all(
                results.map(
                  async (item: EmployeeInfoFromFile, index: number) => {
                    try {
                      // Fetch company and position concurrently
                      const [employeeCorporate, position] = await Promise.all([
                        companyRepository.findOneBy({ name: item.corporate }),
                        positionRepository.findOneBy({
                          name: item.position,
                          level: item.level,
                        }),
                      ]);
                      newEmployees[index].corporate =
                        employeeCorporate || undefined;
                      newEmployees[index].position = position || undefined;

                      // Children
                      let children: EmployeeChildren[] = [];
                      if (item.firstChildName && item.firstChildDob) {
                        const firstChild = employeeChildrenRepository.create({
                          name: item.firstChildName,
                          dob: item.firstChildDob,
                          employee: newEmployees[index],
                        });
                        await employeeChildrenRepository.save(firstChild);

                        children.push(firstChild);
                      }
                      if (item.secondChildName && item.secondChildDob) {
                        const secondChild = employeeChildrenRepository.create({
                          name: item.secondChildName,
                          dob: item.secondChildDob,
                          employee: newEmployees[index],
                        });
                        await employeeChildrenRepository.save(secondChild);

                        children.push(secondChild);
                      }

                      // Save department if exists
                      if (item.department) {
                        const department = await departmentRepository.findOneBy(
                          {
                            name: item.department,
                          }
                        );
                        if (department) {
                          const employeeDepartment =
                            employeeDepartmentRepository.create({
                              employee: newEmployees[index],
                              department,
                            });
                          await employeeDepartmentRepository.save(
                            employeeDepartment
                          );
                        }
                      }

                      // Save contract
                      const contract = contractRepository.create({
                        employee: newEmployees[index],
                        createdBy: session.userId,
                        no: item.contractNumber,
                        contractType: item.contractType,
                        workingType: item.workingType,
                        startDate: item.contractStartDate,
                        endDate: item.contractEndDate,
                        isRemote: item.isRemote,
                        status: ContractStatus.ACTIVE,
                      });
                      await contractRepository.save(contract);

                      // Save education
                      const degree = await degreeRepository.findOneBy({
                        name: item.degree,
                      });
                      if (degree) {
                        const education = educationRepository.create({
                          degree,
                          fromYear: item.fromYear,
                          toYear: item.toYear,
                          school: item.school,
                          major: item.major,
                        });
                        education.employee = newEmployees[index];

                        await educationRepository.save(education);
                      }

                      // Initial Annual Leave
                      const annualLeaveType: LeaveType | null =
                        await leaveTypeRepository.findOne({
                          where: { name: "Annual leave" },
                        });

                      const remainingAnnualLeave =
                        remainingAnnualLeaveRepository.create({
                          employee: newEmployees[index],
                          quantity: 0,
                          status:
                            item.contractType !== ContractTypes.PROBATION
                              ? RemainingAnnualLeaveStatus.ACTIVE
                              : RemainingAnnualLeaveStatus.DISABLED,
                          year: new Date().getFullYear().toString(),
                          leaveType: annualLeaveType!,
                          calculationDate: newEmployees[index].joinDate,
                        });
                      await remainingAnnualLeaveRepository.save(
                        remainingAnnualLeave
                      );
                    } catch (error) {
                      throw new Error(
                        `Error processing employee ${item.employeeName}: ${error}`
                      );
                    }
                  }
                )
              );
              //Notify if there are any errors with
              if (errorRows.length > 0) {
                res.locals.message =
                  "Some employees were not added because their email already exists";
                res.locals.data = {
                  rowsNotAdded: errorRows.sort((a, b) => a.row - b.row),
                };
              } else {
                // // Insert data into the database
                res.locals.message = "Imported employees successfully";
              }

              next();
            } catch (error) {
              //Removed Inserted User if Insert employee has failed
              await userRepository.remove(newUsers);
              next(error);
            }
          } catch (error) {
            next(error);
          }
        })
        .on("error", (parseErr: any) => {
          next(parseErr);
        });
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.EMPLOYEE_MANAGEMENT, canRead: true },
  ])
  @Get("/:id/bank-account")
  public async getBankAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const { dataSource } = req.app.locals;
      const employeeRepository = dataSource.getRepository(Employee);
      const employee: Employee | null = await employeeRepository.findOne({
        where: { id },
      });
      if (!employee) {
        throw new NotFoundError("Employee was not found.");
      }
      res.locals.data = {
        bankName: employee?.bankName,
        bankBranch: employee?.bankBranch,
        bankAccountName: employee?.bankAccountName,
        bankAccountNumber: employee?.bankAccountNumber,
      };
      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    {
      permission: UserPermission.EMPLOYEE_MANAGEMENT,
      canCreate: true,
      canUpdate: true,
    },
  ])
  @Put("/:id/bank-account")
  public async createBankAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { bankName, bankBranch, bankAccountName, bankAccountNumber } =
        req.body;
      const { dataSource } = req.app.locals;

      const employeeRepository = dataSource.getRepository(Employee);
      const employee: Employee | null = await employeeRepository.findOne({
        where: { id },
      });
      if (!employee) {
        throw new NotFoundError("Employee was not found.");
      }

      employeeRepository.merge(employee, {
        bankName,
        bankBranch,
        bankAccountName,
        bankAccountNumber,
      });
      await employeeRepository.save(employee);

      // Save Employee
      res.locals.data = {
        employee,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.EMPLOYEE_MANAGEMENT, canImport: true },
  ])
  @Post("/salary/upload-excel")
  public async uploadSalaryExcelFile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const employeeRepository = dataSource.getRepository(Employee);
      const files: any[] = await handleUploadExcel(req);
      const excelFilePath = files[0]?.filepath;

      try {
        const workbook = xlsx.readFile(excelFilePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Define the expected headers
        const expectedHeaders = [
          "stt",
          "employeeCode",
          "employeeName",
          "position",
          "standardWorkingDay",
          "holidays",
          "unpaidLeave",
          "leaveDays",
          "actualWorkingDay",
          "remainingLeaveDays",
          "totalWorkingDays",
          "basicSalary",
          "responsibilityAllowance",
          "petrolAllowance",
          "phoneAllowance",
          "lunchAllowance",
          "seniorityBonus",
          "performanceBonus",
          "overtimeIncome",
          "otherBonus",
          "otherIncome",
          "totalIncome",
          "socialInsurance",
          "personalIncomeTax",
          "othersDeduction",
          "totalDeduction",
          "netAmount",
        ];

        let results: SalaryInfoFromFile[] = xlsx.utils
          .sheet_to_json(worksheet, {
            header: expectedHeaders,
            range: 2, // Skip the header row
            raw: false,
            defval: "",
          })
          .map((salaryInfo: any) => {
            return new SalaryInfoFromFile({
              ...salaryInfo,
            });
          })
          .filter((item: SalaryInfoFromFile) => item.employeeCode !== "");

        // // Clean up the temp file after processing
        fs.unlink(excelFilePath, (unlinkErr) => {
          if (unlinkErr) {
            return next(unlinkErr);
          }
        });

        for (let employee of results) {
          if (!employee.employeeCode) {
            return next(new BadRequestError("Employee code is required"));
          }
          if (!employee.employeeName) {
            return next(new BadRequestError("Employee name is required"));
          }
        }
        // ///// Update Data to Database
        let employeeCodeErrors: string[] = [];
        const response = await Promise.all(
          results.map((item: SalaryInfoFromFile) => {
            return new Promise<void>(async (resolve, reject) => {
              const employee = await employeeRepository.findOne({
                where: { employeeCode: item.employeeCode },
              });
              if (!employee) {
                employeeCodeErrors.push(
                  `Employee code ${item.employeeCode} is not found.`
                );
              } else {
                employeeRepository.merge(employee, {
                  basicSalary: item.basicSalary,
                  responsibilityAllowance: item.responsibilityAllowance,
                  petrolAllowance: item.petrolAllowance,
                  phoneAllowance: item.phoneAllowance,
                  lunchAllowance: item.lunchAllowance,
                  seniorityBonus: item.seniorityBonus,
                  performanceBonus: item.performanceBonus,
                  overtimeIncome: item.overtimeIncome,
                  otherBonus: item.otherBonus,
                  otherIncome: item.otherIncome,
                  socialInsurance: item.socialInsurance,
                  personalIncomeTax: item.personalIncomeTax,
                  othersDeduction: item.othersDeduction,
                  netAmount: item.netAmount,
                });
                await employeeRepository.save(employee);
              }
              resolve();
            });
          })
        );
        res.locals.message =
          employeeCodeErrors.length === 0
            ? "Upload employee salary information successfully"
            : "Some salary information were not updated because employee code is not found.";
        res.locals.data = {
          employeeCodeErrors,
        };
        next();
      } catch (parseErr) {
        next(parseErr);
      }
      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/change-request")
  @Authorize()
  public async sendChangeInformationRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { session } = res.locals;
      const { dataSource, socket } = req.app.locals;

      const userRepository = dataSource.getRepository(User);
      const employeeRepository = dataSource.getRepository(Employee);
      const groupNotificationRepository =
        dataSource.getRepository(GroupNotification);

      const { email } = req.body;

      const employee: Employee | null = await employeeRepository
        .createQueryBuilder("employee")
        .where("employee.id = :id", { id: session.employeeId })
        .select(["employee"])
        .getOne();

      if (!employee) {
        throw new NotFoundError("Employee is not found.");
      }

      if (email) {
        const emailExist = await userRepository.findOneBy({ email });
        if (emailExist && emailExist.id !== employee?.user.id) {
          throw new NotAcceptableError("Email already in use.");
        }
      }

      const groupNotification = await groupNotificationRepository
        .createQueryBuilder("group_notifications")
        .leftJoinAndSelect("group_notifications.members", "employees")
        .leftJoinAndSelect("employees.user", "users")
        .where("group_notifications.type = :type", {
          type: GroupNotificationType.EMPLOYEE_CHANGE_REQUEST,
        })
        .select(["group_notifications", "employees.id", "users.id"])
        .getOne();

      if (!groupNotification) {
        throw new NotFoundError("Group notification is not found.");
      }

      const urlChangeRequest = `/employees/${employee.id}/change-request`;

      await Promise.all(
        groupNotification.members.map((member: Employee) =>
          createNotification({
            assignee: member.user.id,
            content: `${employee.fullName} has been requested change information`,
            createdBy: session.userId,
            dataSource: dataSource,
            socket: socket,
            actions: urlChangeRequest,
          })
        )
      );

      employee.changedInformation = req.body;
      await employeeRepository.save(employee);

      res.locals.message = "Change information request sent successfully";
      res.locals.data = {
        changedInformation: employee.changedInformation,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id/change-request/:status")
  @Authorize([
    {
      permission: UserPermission.EMPLOYEE_MANAGEMENT,
      canApprove: true,
    },
  ])
  public async updateChangeRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id, status } = req.params;
      const { dataSource, socket } = req.app.locals;
      const { session } = res.locals;
      const employeeRepository = dataSource.getRepository(Employee);
      const employeeChildrenRepository =
        dataSource.getRepository(EmployeeChildren);

      const employee: Employee | null = await employeeRepository.findOne({
        relations: ["user"],
        where: { id },
      });
      if (!employee) {
        throw new NotFoundError("Employee was not found.");
      }

      if (!employee.changedInformation) {
        throw new BadRequestError("Employee has no change request.");
      }

      if (status === "Approve") {
        const changedInformation = Object(employee.changedInformation);
        Object.keys(changedInformation).forEach((key: string) => {
          if (!changedInformation[key]) {
            delete changedInformation[key];
          }
        });

        if (changedInformation.vneIDNo) {
          const employeesExist: Employee[] = await employeeRepository.find({
            where: {
              id: Not(id),
              resignDate: IsNull(),
              vneIDNo: changedInformation.vneIDNo,
            },
          });
          if (employeesExist.length > 0) {
            throw new NotAcceptableError(
              "Duplicate ID No. Please check again."
            );
          }
        }

        if (changedInformation.pitNo) {
          const employeesExist: Employee[] = await employeeRepository.find({
            where: {
              id: Not(id),
              resignDate: IsNull(),
              pitNo: changedInformation.pitNo,
            },
          });
          if (employeesExist.length > 0) {
            throw new NotAcceptableError(
              "Duplicate PIT No. Please check again."
            );
          }
        }

        if (changedInformation.pitNo) {
          const employeesExist: Employee[] = await employeeRepository.find({
            where: {
              id: Not(id),
              resignDate: IsNull(),
              siNo: changedInformation.siNo,
            },
          });
          if (employeesExist.length > 0) {
            throw new NotAcceptableError(
              "Duplicate SI No. Please check again."
            );
          }
        }

        if (changedInformation.photo) {
          if (employee?.photo && employee.photo !== changedInformation.photo) {
            const fileName = employee?.photo.split("/").pop() as string;
            if (fs.existsSync(path.join(config.upload_image_dir, fileName))) {
              fs.unlinkSync(path.join(config.upload_image_dir, fileName));
            }
          }
        }

        if (changedInformation.vneIDCardFront) {
          if (
            employee?.vneIDCardFront &&
            employee.vneIDCardFront !== changedInformation.vneIDCardFront
          ) {
            const fileName = employee?.vneIDCardFront
              .split("/")
              .pop() as string;
            if (fs.existsSync(path.join(config.upload_image_dir, fileName))) {
              fs.unlinkSync(path.join(config.upload_image_dir, fileName));
            }
          }
        }

        if (changedInformation.vneIDCardBack) {
          if (
            employee?.vneIDCardBack &&
            employee.vneIDCardBack !== changedInformation.vneIDCardBack
          ) {
            const fileName = employee?.vneIDCardBack.split("/").pop() as string;
            if (fs.existsSync(path.join(config.upload_image_dir, fileName))) {
              fs.unlinkSync(path.join(config.upload_image_dir, fileName));
            }
          }
        }

        if (changedInformation.personalCV) {
          if (
            employee?.personalCV &&
            employee.personalCV !== changedInformation.personalCV
          ) {
            const fileName = employee?.personalCV.split("/").pop() as string;
            if (fs.existsSync(path.join(config.upload_pdf_dir, fileName))) {
              fs.unlinkSync(path.join(config.upload_pdf_dir, fileName));
            }
          }
        }
        if (changedInformation.companyCV) {
          if (
            employee?.companyCV &&
            employee.companyCV !== changedInformation.companyCV
          ) {
            const fileName = employee?.companyCV.split("/").pop() as string;
            if (fs.existsSync(path.join(config.upload_pdf_dir, fileName))) {
              fs.unlinkSync(path.join(config.upload_pdf_dir, fileName));
            }
          }
        }

        if (changedInformation.children) {
          const employeeChildren = await employeeChildrenRepository.find({
            where: {
              employee: {
                id,
              },
            },
          });
          if (employeeChildren.length > 0) {
            await employeeChildrenRepository.delete(
              employeeChildren.map((item: EmployeeChildren) => item.id)
            );
          }
          const childrenData = changedInformation.children.map(
            (child: EmployeeChildren) => {
              return employeeChildrenRepository.create({
                employee,
                name: child.name,
                dob: child.dob,
              });
            }
          );
          await employeeChildrenRepository.save(childrenData);

          employee.children = [...childrenData];
        }
        employeeRepository.merge(employee, {
          ...omit(changedInformation, ["children"]),
        });
      }

      if (status === "Reject") {
        const changedInformation = Object(employee.changedInformation);
        Object.keys(changedInformation).forEach((key: string) => {
          if (!changedInformation[key]) {
            delete changedInformation[key];
          }
        });

        if (changedInformation.photo) {
          if (
            !employee?.photo ||
            (employee?.photo && employee.photo !== changedInformation.photo)
          ) {
            const fileName = changedInformation?.photo
              .split("/")
              .pop() as string;
            if (fs.existsSync(path.join(config.upload_image_dir, fileName))) {
              fs.unlinkSync(path.join(config.upload_image_dir, fileName));
            }
          }
        }

        if (changedInformation.vneIDCardFront) {
          if (
            !employee?.vneIDCardFront ||
            (employee?.vneIDCardFront &&
              employee.vneIDCardFront !== changedInformation.vneIDCardFront)
          ) {
            const fileName = changedInformation?.vneIDCardFront
              .split("/")
              .pop() as string;
            if (fs.existsSync(path.join(config.upload_image_dir, fileName))) {
              fs.unlinkSync(path.join(config.upload_image_dir, fileName));
            }
          }
        }

        if (changedInformation.vneIDCardBack) {
          if (
            !employee?.vneIDCardBack ||
            (employee?.vneIDCardBack &&
              employee.vneIDCardBack !== changedInformation.vneIDCardBack)
          ) {
            const fileName = changedInformation?.vneIDCardBack
              .split("/")
              .pop() as string;
            if (fs.existsSync(path.join(config.upload_image_dir, fileName))) {
              fs.unlinkSync(path.join(config.upload_image_dir, fileName));
            }
          }
        }

        if (changedInformation.personalCV) {
          if (
            !employee?.personalCV ||
            (employee?.personalCV &&
              employee.personalCV !== changedInformation.personalCV)
          ) {
            const fileName = changedInformation?.personalCV
              .split("/")
              .pop() as string;
            if (fs.existsSync(path.join(config.upload_pdf_dir, fileName))) {
              fs.unlinkSync(path.join(config.upload_pdf_dir, fileName));
            }
          }
        }
        if (changedInformation.companyCV) {
          if (
            !employee?.companyCV ||
            (employee?.companyCV &&
              employee.companyCV !== changedInformation.companyCV)
          ) {
            const fileName = changedInformation?.companyCV
              .split("/")
              .pop() as string;
            if (fs.existsSync(path.join(config.upload_pdf_dir, fileName))) {
              fs.unlinkSync(path.join(config.upload_pdf_dir, fileName));
            }
          }
        }
      }
      employeeRepository.merge(employee, { changedInformation: null });
      await employeeRepository.save(employee);

      const urlChangeRequest = `/employee-details`;

      await createNotification({
        assignee: employee?.user?.id!,
        content: `Your change request has been ${status.toUpperCase()}`,
        createdBy: session.userId,
        dataSource: dataSource,
        socket: socket,
        actions: urlChangeRequest,
      });

      res.locals.message = `${status} change request successfully`;
      res.locals.data = {
        employee,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Get("/:id/change-request")
  @Authorize([
    {
      permission: UserPermission.EMPLOYEE_MANAGEMENT,
      canRead: true,
    },
  ])
  public async getChangeInformationRequest(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;

      const employeeRepository = dataSource.getRepository(Employee);

      const employee: Employee | null = await employeeRepository.findOne({
        where: { id },
      });

      if (!employee) {
        throw new NotFoundError("Employee is not found");
      }

      if (!employee.changedInformation) {
        throw new NotFoundError("Change information request is not found");
      }
      res.locals.message = "Get change information request successfully";
      res.locals.data = {
        changedInformation: employee.changedInformation,
      };
      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id/restore")
  @Authorize([
    { permission: UserPermission.EMPLOYEE_MANAGEMENT, canRestore: true },
  ])
  public async restore(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;

      const employeeRepository = dataSource.getRepository(Employee);

      const employee: Employee | null = await employeeRepository
        .createQueryBuilder("employee")
        .withDeleted()
        .where("employee.id = :id", { id })
        .andWhere("employee.deletedAt IS NOT NULL")
        .getOne();
      if (!employee) {
        throw new NotFoundError("Employee is not found.");
      }

      await employeeRepository.restore(employee.id);

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.TIME_SHEET_MANAGEMENT, canImport: true },
  ])
  @Post("/upload-time-sheet")
  public async uploadTimeSheet(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { month, year } = req.query;

      const files: any[] = await handleUploadTimeSheet(req);
      const timeSheetFilePath = files[0].filepath;

      const fileData = fs.readFileSync(timeSheetFilePath, "utf-8");
      const attendanceData = JSON.parse(fileData);

      if (attendanceData.length === 0) {
        throw new BadRequestError("The JSON file is empty.");
      }

      const filterData = attendanceData.filter((item: any) => {
        const date = new Date(item.timestamp);

        return (
          date.getMonth() + 1 === Number(month) &&
          date.getFullYear() === Number(year)
        );
      });

      const targetDir = path.join(
        config.upload_time_sheet_dir,
        `${year}`,
        `${month}`
      );

      const newPath = path.join(targetDir, "attendance.json");

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.writeFileSync(newPath, JSON.stringify(filterData));
      fs.unlinkSync(timeSheetFilePath);

      res.locals.message = "Time sheet uploaded successfully";

      next();
    } catch (error) {
      next(error);
    }
  }
}

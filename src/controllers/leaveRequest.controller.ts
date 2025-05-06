import { NextFunction, Request, Response } from "express";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import Controller from "../decorators/controller";
import { Delete, Get, Post, Put } from "../decorators/handlers";
import { UserPermission } from "../utils/permission";
import { LeaveType } from "../database/entities/LeaveType";
import { Employee } from "../database/entities/Employee";
import { Department } from "../database/entities/Department";
import { BadRequestError, NotFoundError } from "../utils/errors";
import {
  LeaveRequest,
  LeaveRequestStatus,
} from "../database/entities/LeaveRequest";
import { omit, pick } from "../utils";
import { EmployeeDepartment } from "../database/entities/EmployeeDepartment";
import XLSX from "xlsx";
import { LessThanOrEqual, MoreThanOrEqual } from "typeorm";
import {
  RemainingAnnualLeave,
  RemainingAnnualLeaveStatus,
} from "../database/entities/RemainingAnnualLeave";
import { createNotification } from "../database/repositories/notification.repository";

@Controller("/leave-requests")
@Authenticate()
export default class LeaveRequestController {
  @Authorize([{ permission: UserPermission.LEAVE_MANAGEMENT, canRead: true }])
  @Get("/")
  public async getByEmployer(
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
        leaveTypeId,
        month,
        departmentId,
        status = "All",
        sortBy = "updatedAt",
        orderBy = "DESC",
      } = req.query;

      const leaveRequestRepository = dataSource.getRepository(LeaveRequest);
      const leaveTypeRepository = dataSource.getRepository(LeaveType);
      const departmentRepository = dataSource.getRepository(Department);

      const leaveRequestQuery = leaveRequestRepository
        .createQueryBuilder("leave_requests")
        .leftJoinAndSelect("leave_requests.leaveType", "leave_types")
        .leftJoinAndSelect("leave_requests.employee", "employees")
        .leftJoinAndSelect("employees.departments", "employees_departments")
        .leftJoinAndSelect("employees_departments.department", "departments")
        .leftJoinAndSelect("leave_requests.approver", "approver");

      // filter
      if (leaveTypeId) {
        const leaveType: LeaveType | null = await leaveTypeRepository.findOne({
          where: { id: leaveTypeId.toString() },
        });
        if (!leaveType) {
          throw new NotFoundError("Leave type is not found");
        }

        leaveRequestQuery.andWhere(
          "leave_requests.leaveTypeId = :leaveTypeId",
          {
            leaveTypeId,
          }
        );
      }

      if (month) {
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, Number(month) - 1, 1);
        const endDate = new Date(currentYear, Number(month), 0);

        leaveRequestQuery.andWhere(
          "(leave_requests.startDate <= :endDate AND leave_requests.endDate >= :startDate)",
          {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }
        );
      }

      if (departmentId) {
        const department: Department | null =
          await departmentRepository.findOne({
            where: { id: departmentId.toString() },
          });
        if (!department) {
          throw new NotFoundError("Department is not found");
        }

        leaveRequestQuery.andWhere("departments.id = :departmentId", {
          departmentId,
        });
      }

      if (status !== "All") {
        leaveRequestQuery.andWhere("leave_requests.status = :status", {
          status,
        });
      }

      // search
      if (search) {
        leaveRequestQuery.andWhere("employees.fullName ILIKE :search", {
          search: `%${search}%`,
        });
      } else {
        // sort
        let objQuery: string = "leave_requests";
        let objProperty: string = "updatedAt";

        if (sortBy !== "updatedAt") {
          switch (sortBy) {
            case "name": {
              objQuery = "employees";
              objProperty = "fullName";
              break;
            }
          }
        }

        leaveRequestQuery.orderBy(
          `${objQuery}.${objProperty}`,
          orderBy === "asc" ? "ASC" : "DESC"
        );
      }

      // pagination
      leaveRequestQuery
        .skip(
          pageSize && pageIndex
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined
        )
        .take(pageSize && pageIndex ? Number(pageSize) : undefined);

      const [leaveRequests, count] = await leaveRequestQuery
        .select([
          "leave_requests",
          "leave_types",
          "employees.id",
          "employees.fullName",
          "employees.photo",
          "employees_departments",
          "departments.id",
          "departments.name",
          "approver.id",
          "approver.fullName",
          "approver.photo",
        ])
        .getManyAndCount();

      const result = leaveRequests.map((leaveRequest: LeaveRequest) => ({
        ...omit(leaveRequest, ["employee"]),
        employee: {
          ...omit(leaveRequest.employee, ["departments"]),
          departments: leaveRequest.employee.departments.map(
            (employeeDepartment: EmployeeDepartment) =>
              employeeDepartment.department
          ),
        },
      }));

      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count,
        leaveRequests: result,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([{ permission: UserPermission.LEAVE_MANAGEMENT, canRead: true }])
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
        leaveTypeId,
        month,
        departmentId,
        status = "All",
        sortBy = "updatedAt",
        orderBy = "DESC",
      } = req.query;

      const leaveRequestRepository = dataSource.getRepository(LeaveRequest);
      const leaveTypeRepository = dataSource.getRepository(LeaveType);
      const employeeRepository = dataSource.getRepository(Employee);
      const employeeDepartmentRepository =
        dataSource.getRepository(EmployeeDepartment);
      const departmentRepository = dataSource.getRepository(Department);

      const manager: Employee | null = await employeeRepository
        .createQueryBuilder("employees")
        .where("employees.id = :id", { id: session.employeeId })
        .getOne();
      if (!manager) {
        throw new NotFoundError("Your employee information is not found");
      }

      const employeesDepartments: EmployeeDepartment[] =
        await employeeDepartmentRepository.find({
          relations: ["department"],
          where: { employee: { id: session.employeeId }, isManager: true },
        });
      if (employeesDepartments.length < 1) {
        throw new NotFoundError("You are not a manager of any department");
      }

      const departmentIds = employeesDepartments.map(
        (employeeDepartment: EmployeeDepartment) =>
          employeeDepartment.department.id
      );

      const leaveRequestQuery = leaveRequestRepository
        .createQueryBuilder("leave_requests")
        .leftJoinAndSelect("leave_requests.leaveType", "leave_types")
        .leftJoinAndSelect("leave_requests.employee", "employees")
        .leftJoinAndSelect("employees.departments", "employees_departments")
        .leftJoinAndSelect("employees_departments.department", "departments")
        .leftJoinAndSelect("leave_requests.approver", "approver")
        .where("departments.id IN (:...departmentIds)", { departmentIds });

      // filter
      if (leaveTypeId) {
        const leaveType: LeaveType | null = await leaveTypeRepository.findOne({
          where: { id: leaveTypeId.toString() },
        });
        if (!leaveType) {
          throw new NotFoundError("Leave type is not found");
        }

        leaveRequestQuery.andWhere(
          "leave_requests.leaveTypeId = :leaveTypeId",
          {
            leaveTypeId,
          }
        );
      }

      if (month) {
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, Number(month) - 1, 1);
        const endDate = new Date(currentYear, Number(month), 0);

        leaveRequestQuery.andWhere(
          "(leave_requests.startDate <= :endDate AND leave_requests.endDate >= :startDate)",
          {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }
        );
      }

      if (departmentId) {
        const department: Department | null =
          await departmentRepository.findOne({
            where: { id: departmentId.toString() },
          });
        if (!department) {
          throw new NotFoundError("Department is not found");
        }

        leaveRequestQuery.andWhere("departments.id = :departmentId", {
          departmentId,
        });
      }

      if (status !== "All") {
        leaveRequestQuery.andWhere("leave_requests.status = :status", {
          status,
        });
      }

      // search
      if (search) {
        leaveRequestQuery.andWhere("employees.fullName ILIKE :search", {
          search: `%${search}%`,
        });
      } else {
        // sort
        let objQuery: string = "leave_requests";
        let objProperty: string = "updatedAt";

        if (sortBy !== "updatedAt") {
          switch (sortBy) {
            case "name": {
              objQuery = "employees";
              objProperty = "fullName";
              break;
            }
          }
        }

        leaveRequestQuery.orderBy(
          `${objQuery}.${objProperty}`,
          orderBy === "asc" ? "ASC" : "DESC"
        );
      }

      // pagination
      leaveRequestQuery
        .skip(
          pageIndex && pageSize
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined
        )
        .take(pageIndex && pageSize ? Number(pageSize) : undefined);

      const [leaveRequests, count] = await leaveRequestQuery
        .select([
          "leave_requests",
          "leave_types",
          "employees.id",
          "employees.fullName",
          "employees.photo",
          "employees_departments",
          "departments.id",
          "departments.name",
          "approver.id",
          "approver.fullName",
          "approver.photo",
        ])
        .getManyAndCount();

      const result = leaveRequests.map((leaveRequest: LeaveRequest) => ({
        ...omit(leaveRequest, ["employee"]),
        employee: {
          ...omit(leaveRequest.employee, ["departments"]),
          departments: leaveRequest.employee.departments.map(
            (employeeDepartment: EmployeeDepartment) =>
              employeeDepartment.department
          ),
        },
      }));

      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count,
        leaveRequests: result,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.LEAVE_MANAGEMENT, canApprove: true },
  ])
  @Get("/approval")
  public async getByApprover(
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
        leaveTypeId,
        month,
        departmentId,
        status = "All",
        sortBy = "updatedAt",
        orderBy = "DESC",
      } = req.query;

      const leaveRequestRepository = dataSource.getRepository(LeaveRequest);
      const leaveTypeRepository = dataSource.getRepository(LeaveType);
      const employeeRepository = dataSource.getRepository(Employee);
      const departmentRepository = dataSource.getRepository(Department);

      const approver: Employee | null = await employeeRepository
        .createQueryBuilder("employees")
        .where("employees.id = :id", { id: session.employeeId })
        .getOne();
      if (!approver) {
        throw new NotFoundError("Your employee information is not found");
      }

      const leaveRequestQuery = leaveRequestRepository
        .createQueryBuilder("leave_requests")
        .where("leave_requests.approverId = :approverId", {
          approverId: session.employeeId,
        })
        .leftJoinAndSelect("leave_requests.leaveType", "leave_types")
        .leftJoinAndSelect("leave_requests.employee", "employees")
        .leftJoinAndSelect("employees.departments", "employees_departments")
        .leftJoinAndSelect("employees_departments.department", "departments");

      // filter
      if (leaveTypeId) {
        const leaveType: LeaveType | null = await leaveTypeRepository.findOne({
          where: { id: leaveTypeId.toString() },
        });
        if (!leaveType) {
          throw new NotFoundError("Leave type is not found");
        }

        leaveRequestQuery.andWhere(
          "leave_requests.leaveTypeId = :leaveTypeId",
          {
            leaveTypeId,
          }
        );
      }

      if (month) {
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, Number(month) - 1, 1);
        const endDate = new Date(currentYear, Number(month), 0);

        leaveRequestQuery.andWhere(
          "(leave_requests.startDate <= :endDate AND leave_requests.endDate >= :startDate)",
          {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }
        );
      }

      if (departmentId) {
        const department: Department | null =
          await departmentRepository.findOne({
            where: { id: departmentId.toString() },
          });
        if (!department) {
          throw new NotFoundError("Department is not found");
        }

        leaveRequestQuery.andWhere("departments.id = :departmentId", {
          departmentId,
        });
      }

      if (status !== "All") {
        leaveRequestQuery.andWhere("leave_requests.status = :status", {
          status,
        });
      }

      // search
      if (search) {
        leaveRequestQuery.andWhere("employees.fullName ILIKE :search", {
          search: `%${search}%`,
        });
      } else {
        // sort
        let objQuery: string = "leave_requests";
        let objProperty: string = "updatedAt";

        if (sortBy !== "updatedAt") {
          switch (sortBy) {
            case "name": {
              objQuery = "employees";
              objProperty = "fullName";
              break;
            }
          }
        }

        leaveRequestQuery.orderBy(
          `${objQuery}.${objProperty}`,
          orderBy === "asc" ? "ASC" : "DESC"
        );
      }

      // pagination
      leaveRequestQuery
        .skip(
          pageSize && pageIndex
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined
        )
        .take(pageSize && pageIndex ? Number(pageSize) : undefined);

      const [leaveRequests, count] = await leaveRequestQuery
        .select([
          "leave_requests",
          "leave_types",
          "employees.id",
          "employees.fullName",
          "employees.photo",
          "employees_departments",
          "departments.id",
          "departments.name",
        ])
        .getManyAndCount();

      const result = leaveRequests.map((leaveRequest: LeaveRequest) => ({
        ...omit(leaveRequest, ["employee"]),
        employee: {
          ...omit(leaveRequest.employee, ["departments"]),
          departments: leaveRequest.employee.departments.map(
            (employeeDepartment: EmployeeDepartment) =>
              employeeDepartment.department
          ),
        },
      }));

      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count,
        leaveRequests: result,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([{ permission: UserPermission.LEAVE_MANAGEMENT, canExport: true }])
  @Get("/export-excel")
  public async exportExcelFile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { pageSize, pageIndex, leaveTypeId, month } = req.query;

      const leaveRequestRepository = dataSource.getRepository(LeaveRequest);
      const leaveTypeRepository = dataSource.getRepository(LeaveType);

      const leaveRequestQuery = leaveRequestRepository
        .createQueryBuilder("leave_requests")
        .leftJoinAndSelect("leave_requests.leaveType", "leave_types")
        .leftJoinAndSelect("leave_requests.employee", "employees")
        .leftJoinAndSelect("leave_requests.approver", "approver")
        .leftJoinAndSelect("employees.departments", "employees_departments")
        .leftJoinAndSelect("employees_departments.department", "departments");

      // filter
      if (leaveTypeId) {
        const leaveType: LeaveType | null = await leaveTypeRepository.findOne({
          where: { id: leaveTypeId.toString() },
        });
        if (!leaveType) {
          throw new NotFoundError("Leave type is not found");
        }

        leaveRequestQuery.andWhere(
          "leave_requests.leaveTypeId = :leaveTypeId",
          {
            leaveTypeId,
          }
        );
      }

      if (month) {
        const currentYear = new Date().getFullYear();
        const startDate = new Date(currentYear, Number(month) - 1, 1);
        const endDate = new Date(currentYear, Number(month), 0);

        leaveRequestQuery.andWhere(
          "(leave_requests.startDate <= :endDate AND leave_requests.endDate >= :startDate)",
          {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          }
        );
      }

      // sort
      leaveRequestQuery.orderBy("leave_requests.updatedAt", "DESC");

      // pagination
      if (pageSize && pageIndex) {
        leaveRequestQuery
          .skip(Number(pageSize) * (Number(pageIndex) - 1))
          .take(Number(pageSize));
      }

      const leaveRequests: LeaveRequest[] = await leaveRequestQuery
        .select([
          "leave_requests",
          "leave_types",
          "employees.id",
          "employees.fullName",
          "approver.id",
          "approver.fullName",
          "employees_departments",
          "departments.id",
          "departments.name",
        ])
        .getMany();

      const result = leaveRequests.map((leaveRequest: LeaveRequest) => ({
        employeeName: leaveRequest.employee.fullName,
        department: leaveRequest.employee.departments
          .map(
            (employeeDepartment: EmployeeDepartment) =>
              employeeDepartment.department.name
          )
          .join(", "),
        leaveType: leaveRequest.leaveType.name,
        startDate: leaveRequest.startDate.toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
        endDate: leaveRequest.endDate.toLocaleString("en-US", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
        numberOfDays: leaveRequest.numberOfDays,
        leavePeriod: leaveRequest?.leavePeriod,
        reason: leaveRequest.reason,
        assignTo: leaveRequest.approver.fullName,
        confirmed:
          leaveRequest.status !== LeaveRequestStatus.PENDING
            ? leaveRequest.status +
              " at " +
              leaveRequest.updatedAt.toLocaleString("en-US", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
              })
            : "",
        comments: leaveRequest.comment,
        isFormCustomer: leaveRequest.isInformCustomer,
      }));

      const worksheet = XLSX.utils.json_to_sheet(result);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Leave Requests");

      const headers = [
        "Employee Name",
        "Department",
        "Leave Type",
        "Start Date",
        "End Date",
        "Number Of Days",
        "Leave Period",
        "Reason",
        "Assigned To",
        "Confirmed",
        "Comments",
        "Inform Customer",
      ];

      XLSX.utils.sheet_add_aoa(worksheet, [headers], { origin: "A1" });

      worksheet["!cols"] = [
        { wch: 25 },
        { wch: 25 },
        { wch: 25 },
        { wch: 20 },
        { wch: 20 },
        { wch: 14 },
        { wch: 18 },
        { wch: 25 },
        { wch: 25 },
        { wch: 28 },
        { wch: 25 },
        { wch: 20 },
      ];

      const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      res.statusCode = 200;
      res.locals.message = "Exported successfully";
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="LeaveRequests.xlsx"'
      );
      res.setHeader("Content-Type", "application/vnd.ms-excel");
      res.end(buf);
    } catch (error) {
      next(error);
    }
  }

  @Authorize([{ permission: UserPermission.LEAVE_MANAGEMENT, canRead: true }])
  @Get("/leave-information")
  public async getLeaveInformation(
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
        year = new Date().getFullYear().toString(),
        departmentId,
        sortBy,
        orderBy,
      } = req.query;

      const leaveRequestRepository = dataSource.getRepository(LeaveRequest);
      const employeeRepository = dataSource.getRepository(Employee);
      const departmentRepository = dataSource.getRepository(Department);

      const employeeQuery = employeeRepository
        .createQueryBuilder("employees")
        .leftJoinAndSelect("employees.departments", "employees_departments")
        .leftJoinAndSelect("employees_departments.department", "departments")
        .innerJoinAndSelect(
          "employees.remainingAnnualLeaves",
          "remainingAnnualLeaves",
          "remainingAnnualLeaves.year = :year",
          { year }
        );

      if (departmentId) {
        const department: Department | null =
          await departmentRepository.findOne({
            where: { id: departmentId.toString() },
          });
        if (!department) {
          throw new NotFoundError("Department is not found");
        }

        employeeQuery.andWhere("departments.id = :departmentId", {
          departmentId,
        });
      }

      // search
      if (search) {
        employeeQuery.andWhere("employees.fullName ILIKE :search", {
          search: `%${search}%`,
        });
      } else {
        // sort
        if (sortBy && orderBy) {
          let objQuery: string = "employees";
          let objProperty: string = "fullName";

          switch (sortBy) {
            case "name": {
              objQuery = "employees";
              objProperty = "fullName";
              break;
            }
          }

          employeeQuery.orderBy(
            `${objQuery}.${objProperty}`,
            orderBy === "asc" ? "ASC" : "DESC"
          );
        }
      }

      // pagination
      employeeQuery
        .skip(
          pageSize && pageIndex
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined
        )
        .take(pageSize && pageIndex ? Number(pageSize) : undefined);

      const [employees, count] = await employeeQuery
        .select([
          "employees.id",
          "employees.fullName",
          "employees_departments.id",
          "departments.id",
          "departments.name",
          "remainingAnnualLeaves",
        ])
        .getManyAndCount();

      const leaveRequests: any[] = await leaveRequestRepository
        .createQueryBuilder("leave_requests")
        .leftJoinAndSelect("leave_requests.leaveType", "leave_types")
        .leftJoinAndSelect("leave_requests.employee", "employees")
        .where("leave_requests.status = :status", {
          status: LeaveRequestStatus.APPROVED,
        })
        .andWhere(
          "(leave_requests.startDate <= :endDate AND leave_requests.endDate >= :startDate)",
          {
            startDate: `${year}-01-01`,
            endDate: `${year}-12-31`,
          }
        )
        .groupBy("employees.id")
        .addGroupBy("leave_types.id")
        .select([
          'employees.id AS "employeeId"',
          'leave_types.id AS "leaveTypeId"',
          'leave_types.name AS "leaveTypeName"',
          'SUM(leave_requests.numberOfDays) AS "totalLeaveDays"',
        ])
        .getRawMany();

      const result = employees.map((employee: Employee) => {
        const leaveRequestsOfEmployee = leaveRequests.filter(
          (leaveRequest: any) => leaveRequest.employeeId === employee.id
        );

        const usedAnnualLeave = leaveRequestsOfEmployee.find(
          (item: any) => item.leaveTypeName === "Annual leave"
        );

        let totalAnnualLeave: number =
          employee.remainingAnnualLeaves[0].quantity;

        if (usedAnnualLeave && usedAnnualLeave.totalLeaveDays) {
          totalAnnualLeave += usedAnnualLeave.totalLeaveDays;
        }

        return {
          id: employee.id,
          fullName: employee.fullName,
          departments: employee.departments.map(
            (employeeDepartment: EmployeeDepartment) =>
              employeeDepartment.department
          ),
          totalAnnualLeave: totalAnnualLeave ? totalAnnualLeave : 0,
          remainingAnnualLeave: employee.remainingAnnualLeaves[0]
            ? employee.remainingAnnualLeaves[0].quantity
            : 0,
          usedLeaves: leaveRequestsOfEmployee,
        };
      });

      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count,
        leaveInformation: result,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([{ permission: UserPermission.LEAVE_MANAGEMENT, canRead: true }])
  @Get("/leave-information/detail")
  public async getLeaveDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { employeeId, leaveTypeId, startDate, endDate, year } = req.body;

      if (!employeeId) {
        throw new BadRequestError("Employee ID is required");
      }

      if (!leaveTypeId) {
        throw new BadRequestError("Leave type ID is required");
      }

      const leaveRequestRepository = dataSource.getRepository(LeaveRequest);

      const leaveRequests: LeaveRequest[] = await leaveRequestRepository.find({
        relations: ["employee", "leaveType", "approver"],
        where: {
          employee: {
            id: employeeId,
          },
          leaveType: {
            id: leaveTypeId,
          },
          startDate: year
            ? MoreThanOrEqual(new Date(`${year}-01-01`))
            : LessThanOrEqual(new Date(endDate)),
          endDate: year
            ? LessThanOrEqual(new Date(`${year}-12-31`))
            : MoreThanOrEqual(new Date(startDate)),
          status: LeaveRequestStatus.APPROVED,
        },
        select: {
          leaveType: {
            id: true,
            name: true,
            regulationQuantity: true,
            orderNumber: true,
          },
          approver: {
            id: true,
            fullName: true,
          },
          employee: {
            id: true,
            fullName: true,
          },
        },
      });

      res.locals.data = {
        leaveRequests,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize()
  @Get("/me")
  public async getByEmployee(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { session } = res.locals;
      const { pageSize, pageIndex, leaveTypeId, year } = req.query;

      const leaveRequestRepository = dataSource.getRepository(LeaveRequest);
      const leaveTypeRepository = dataSource.getRepository(LeaveType);
      const employeeRepository = dataSource.getRepository(Employee);

      const employee: Employee | null = await employeeRepository
        .createQueryBuilder("employees")
        .where("employees.id = :id", { id: session.employeeId })
        .getOne();
      if (!employee) {
        throw new NotFoundError("Your employee information is not found");
      }

      const leaveRequestQuery = leaveRequestRepository
        .createQueryBuilder("leave_requests")
        .leftJoinAndSelect("leave_requests.leaveType", "leave_types")
        .leftJoinAndSelect("leave_requests.approver", "approver")
        .where("leave_requests.employeeId = :employeeId", {
          employeeId: session.employeeId,
        });

      // filter
      if (leaveTypeId) {
        const leaveType: LeaveType | null = await leaveTypeRepository.findOne({
          where: { id: leaveTypeId.toString() },
        });
        if (!leaveType) {
          throw new NotFoundError("Leave type is not found");
        }

        leaveRequestQuery.andWhere(
          "leave_requests.leaveTypeId = :leaveTypeId",
          {
            leaveTypeId,
          }
        );
      }

      if (year) {
        leaveRequestQuery.andWhere(
          "(leave_requests.startDate <= :endDate AND leave_requests.endDate >= :startDate)",
          {
            startDate: `${year}-01-01`,
            endDate: `${year}-12-31`,
          }
        );
      }

      // sort
      leaveRequestQuery.orderBy("leave_requests.updatedAt", "DESC");

      // pagination
      leaveRequestQuery
        .skip(
          pageSize && pageIndex
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined
        )
        .take(pageSize && pageIndex ? Number(pageSize) : undefined);

      const [leaveRequests, count] = await leaveRequestQuery
        .select([
          "leave_requests",
          "leave_types",
          "approver.id",
          "approver.fullName",
        ])
        .getManyAndCount();

      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count,
        leaveRequests,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/")
  @Authorize()
  public async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        leaveTypeId,
        approverId,
        startDate,
        endDate,
        numberOfDays,
        leavePeriod,
        reason,
        isInformCustomer,
      } = req.body;
      const { dataSource, socket } = req.app.locals;
      const { session } = res.locals;

      const leaveTypeRepository = dataSource.getRepository(LeaveType);
      const employeeRepository = dataSource.getRepository(Employee);
      const leaveRequestRepository = dataSource.getRepository(LeaveRequest);
      const remainingAnnualLeaveRepository =
        dataSource.getRepository(RemainingAnnualLeave);

      const leaveType: LeaveType | null = await leaveTypeRepository.findOne({
        where: { id: leaveTypeId },
      });
      if (!leaveType) {
        throw new NotFoundError("Leave type is not found");
      }

      const approver: Employee | null = await employeeRepository.findOne({
        relations: ["user"],
        where: { id: approverId },
      });
      if (!approver) {
        throw new NotFoundError("Approver is not found");
      }

      const employee: Employee | null = await employeeRepository
        .createQueryBuilder("employee")
        .where("employee.id = :id", { id: session.employeeId })
        .getOne();
      if (!employee) {
        throw new NotFoundError("Your employee information is not found");
      }

      if (
        leaveType.createdBy === "migration" &&
        leaveType.name === "Annual leave"
      ) {
        const remainingAnnualLeave: RemainingAnnualLeave | null =
          await remainingAnnualLeaveRepository.findOne({
            where: {
              employee: {
                id: employee.id,
              },
              year: new Date().getFullYear().toString(),
              status: RemainingAnnualLeaveStatus.DISABLED,
            },
          });

        if (remainingAnnualLeave) {
          throw new NotFoundError(
            "You are in the probation phase. Cannot use Annual Leave!"
          );
        }
      }

      const leaveRequest: LeaveRequest = leaveRequestRepository.create({
        leaveType,
        approver,
        employee,
        startDate,
        endDate,
        leavePeriod,
        numberOfDays,
        reason,
        status: LeaveRequestStatus.PENDING,
        createdBy: session.userId,
        isInformCustomer,
      });

      await leaveRequestRepository.save(leaveRequest);

      const urlChangeRequest = `/leave-requests-approver/${leaveRequest.id}`;

      await createNotification({
        assignee: approver.user.id,
        content: `${employee.fullName} has been assigned to leave request ${leaveRequest.id}.`,
        createdBy: session.userId,
        dataSource: dataSource,
        socket: socket,
        actions: urlChangeRequest,
      });

      res.locals.message = "Leave request is created successfully";
      res.locals.data = {
        leaveRequest: {
          ...omit(leaveRequest, ["approver", "employee"]),
          approver: pick(leaveRequest.approver, ["id", "fullName", "photo"]),
          employee: pick(leaveRequest.employee, ["id", "fullName", "photo"]),
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.LEAVE_MANAGEMENT, canApprove: true },
  ])
  @Get("/:id")
  public async getLeaveRequestById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { session } = res.locals;
      const { id } = req.params;

      const leaveRequestRepository = dataSource.getRepository(LeaveRequest);
      const employeeRepository = dataSource.getRepository(Employee);

      const approver: Employee | null = await employeeRepository
        .createQueryBuilder("employees")
        .where("employees.id = :id", { id: session.employeeId })
        .getOne();
      if (!approver) {
        throw new NotFoundError("Your employee information is not found");
      }

      const leaveRequestQuery = leaveRequestRepository
        .createQueryBuilder("leave_requests")
        .where(
          "leave_requests.approverId = :approverId AND leave_requests.id = :id",
          {
            approverId: session.employeeId,
            id,
          }
        )
        .leftJoinAndSelect("leave_requests.leaveType", "leave_types")
        .leftJoinAndSelect("leave_requests.employee", "employees")
        .leftJoinAndSelect("employees.departments", "employees_departments")
        .leftJoinAndSelect("employees_departments.department", "departments");

      let leaveRequest = await leaveRequestQuery
        .select([
          "leave_requests",
          "leave_types",
          "employees.id",
          "employees.fullName",
          "employees.photo",
          "employees_departments",
          "departments.id",
          "departments.name",
        ])
        .getOne();

      if (!leaveRequest) {
        throw new NotFoundError("Leave request is not found");
      }

      const result = {
        ...omit(leaveRequest, ["employee"]),
        employee: {
          ...omit(leaveRequest.employee, ["departments"]),
          departments: leaveRequest.employee.departments.map(
            (employeeDepartment: EmployeeDepartment) =>
              employeeDepartment.department
          ),
        },
      };

      res.locals.data = {
        leaveRequests: result,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id")
  @Authorize([
    { permission: UserPermission.LEAVE_MANAGEMENT, canApprove: true },
  ])
  public async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { session, socket } = res.locals;
      const { status, comment } = req.body;
      const { dataSource } = req.app.locals;

      const leaveRequestRepository = dataSource.getRepository(LeaveRequest);
      const employeeRepository = dataSource.getRepository(Employee);
      const remainingAnnualLeaveRepository =
        dataSource.getRepository(RemainingAnnualLeave);

      const approver: Employee | null = await employeeRepository
        .createQueryBuilder("employees")
        .where("employees.id = :id", { id: session.employeeId })
        .getOne();
      if (!approver) {
        throw new NotFoundError("Your employee information is not found");
      }

      const leaveRequest: LeaveRequest | null = await leaveRequestRepository
        .createQueryBuilder("leave_requests")
        .where("leave_requests.id = :id", { id })
        .andWhere("leave_requests.approverId = :approverId", {
          approverId: session.employeeId,
        })
        .leftJoinAndSelect("leave_requests.leaveType", "leave_types")
        .leftJoinAndSelect("leave_requests.employee", "employees")
        .leftJoinAndSelect("employees.departments", "employees_departments")
        .leftJoinAndSelect("employees_departments.department", "departments")
        .select([
          "leave_requests",
          "leave_types",
          "employees.id",
          "employees.fullName",
          "employees.photo",
          "employees_departments",
          "departments.id",
          "departments.name",
        ])
        .getOne();
      if (!leaveRequest) {
        throw new NotFoundError("Leave request is not found.");
      }

      if (status === LeaveRequestStatus.APPROVED) {
        const remainingAnnualLeave: RemainingAnnualLeave | null =
          await remainingAnnualLeaveRepository.findOne({
            where: {
              employee: {
                id: leaveRequest.employee.id,
              },
              year: new Date().getFullYear().toString(),
            },
          });

        if (remainingAnnualLeave) {
          remainingAnnualLeaveRepository.merge(remainingAnnualLeave, {
            quantity: remainingAnnualLeave.quantity - leaveRequest.numberOfDays,
          });
          await remainingAnnualLeaveRepository.save(remainingAnnualLeave);
        }
      }

      leaveRequestRepository.merge(leaveRequest, { status, comment });
      await leaveRequestRepository.save(leaveRequest);

      const employee: Employee | null = await employeeRepository.findOne({
        relations: ["user"],
        where: { id: leaveRequest.employee.id },
      });

      const urlChangeRequest = `/submit-leave/${leaveRequest.id}`;

      await createNotification({
        assignee: employee?.user?.id!,
        content: `Leave request ${
          leaveRequest.id
        } has been ${status.toUpperCase()} by ${approver.fullName}.`,
        createdBy: session.userId,
        dataSource: dataSource,
        socket: socket,
        actions: urlChangeRequest,
      });

      res.locals.message = "Updated leave request successfully";
      res.locals.data = {
        leaveRequest: {
          ...omit(leaveRequest, ["employee"]),
          employee: {
            ...omit(leaveRequest.employee, ["departments"]),
            departments: leaveRequest.employee.departments.map(
              (employeeDepartment: EmployeeDepartment) =>
                employeeDepartment.department
            ),
          },
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id/permanently")
  @Authorize()
  public async hardDelete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { session } = res.locals;
      const { dataSource } = req.app.locals;

      const leaveRequestRepository = dataSource.getRepository(LeaveRequest);
      const employeeRepository = dataSource.getRepository(Employee);

      const employee: Employee | null = await employeeRepository
        .createQueryBuilder("employees")
        .where("employees.id = :id", { id: session.employeeId })
        .getOne();
      if (!employee) {
        throw new NotFoundError("Your employee information is not found");
      }

      const leaveRequest: LeaveRequest | null = await leaveRequestRepository
        .createQueryBuilder("leave_requests")
        .withDeleted()
        .where("leave_requests.id = :id", { id })
        .andWhere("leave_requests.deletedAt IS NOT NULL")
        .andWhere("leave_requests.employeeId = :employeeId", {
          employeeId: session.employeeId,
        })
        .getOne();
      if (!leaveRequest) {
        throw new NotFoundError("Leave request is not found.");
      }

      await leaveRequestRepository.delete(id);

      res.locals.message = "Leave request permanently deleted successfully.";

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id")
  @Authorize([{ permission: UserPermission.LEAVE_MANAGEMENT, canDelete: true }])
  public async softDelete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { session } = res.locals;
      const { dataSource } = req.app.locals;

      const leaveRequestRepository = dataSource.getRepository(LeaveRequest);
      const employeeRepository = dataSource.getRepository(Employee);

      const employee: Employee | null = await employeeRepository
        .createQueryBuilder("employees")
        .where("employees.id = :id", { id: session.employeeId })
        .getOne();
      if (!employee) {
        throw new NotFoundError("Your employee information is not found");
      }

      const leaveRequest = await leaveRequestRepository.findOne({
        where: { id, employee: { id: session.employeeId } },
      });
      if (!leaveRequest) {
        throw new NotFoundError("Leave request is not found.");
      }

      await leaveRequestRepository.softDelete({ id });

      res.locals.message = "Deleted leave request successfully";

      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id/restore")
  @Authorize()
  public async restore(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;

      const leaveRequestRepository = dataSource.getRepository(LeaveRequest);

      const leaveRequest: LeaveRequest | null = await leaveRequestRepository
        .createQueryBuilder("leaveRequest")
        .withDeleted()
        .where("leaveRequest.id = :id", { id })
        .andWhere("leaveRequest.deletedAt IS NOT NULL")
        .getOne();

      if (!leaveRequest) {
        throw new NotFoundError("Leave Request is not found.");
      }

      await leaveRequestRepository.restore(leaveRequest.id);

      next();
    } catch (error) {
      next(error);
    }
  }
}

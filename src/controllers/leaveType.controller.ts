import { NextFunction, Request, Response } from "express";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import Controller from "../decorators/controller";
import { Delete, Get, Post, Put } from "../decorators/handlers";
import { UserPermission } from "../utils/permission";
import { LeaveType } from "../database/entities/LeaveType";
import { NotAcceptableError, NotFoundError } from "../utils/errors";
import { ILike } from "typeorm";
import { LeaveRequest } from "../database/entities/LeaveRequest";
import { RemainingAnnualLeave } from "../database/entities/RemainingAnnualLeave";
import { Employee } from "../database/entities/Employee";

@Controller("/leave-types")
@Authenticate()
export default class LeaveTypeController {
  @Authorize([
    { permission: UserPermission.LEAVE_TYPE_MANAGEMENT, canRead: true },
  ])
  @Get("/")
  public async get(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { pageSize, pageIndex, search } = req.query;

      const leaveTypeRepository = dataSource.getRepository(LeaveType);

      const leaveTypes = await leaveTypeRepository.find({
        where: {
          name: search ? ILike(`%${search}%`) : undefined,
        },
        order: {
          orderNumber: "ASC",
        },
        skip:
          pageSize && pageIndex
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined,
        take: pageSize && pageIndex ? Number(pageSize) : undefined,
      });

      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count: await leaveTypeRepository.count({
          where: {
            name: search ? ILike(`%${search}%`) : undefined,
          },
        }),
        leaveTypes,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.LEAVE_TYPE_MANAGEMENT, canRead: true },
  ])
  @Get("/employee/:id")
  public async getByEmployee(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;
      const {
        pageSize,
        pageIndex,
        year = new Date().getFullYear().toString(),
      } = req.query;

      const leaveTypeRepository = dataSource.getRepository(LeaveType);
      const remainingAnnualLeaveRepository =
        dataSource.getRepository(RemainingAnnualLeave);

      const [leaveTypes, count] = await leaveTypeRepository
        .createQueryBuilder("leaveType")
        .leftJoinAndSelect(
          "leaveType.leaveRequests",
          "leaveRequest",
          "leaveRequest.status = 'Approved' AND leaveRequest.employeeId = :employeeId AND EXTRACT(YEAR FROM leaveRequest.createdAt) =:year",
          { employeeId: id, year: year.toString() }
        )
        .orderBy("leaveType.orderNumber", "ASC")
        .skip(
          pageSize && pageIndex
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined
        )
        .take(pageSize && pageIndex ? Number(pageSize) : undefined)
        .getManyAndCount();

      // Get Annual Leave
      const annualLeave = await remainingAnnualLeaveRepository.findOne({
        where: {
          employee: {
            id,
          },
          year: year.toString(),
        },
      });

      // Format data
      const results = leaveTypes.map((leaveType: LeaveType) => {
        const { leaveRequests, ...restLeaveType } = leaveType;
        let used = 0;
        leaveRequests.forEach((leaveRequest: LeaveRequest) => {
          used += leaveRequest.numberOfDays;
        });

        if (leaveType.createdBy === "migration") {
          return {
            ...restLeaveType,
            total: annualLeave?.quantity || 0,
            used,
            remaining: annualLeave ? annualLeave.quantity : 0,
          };
        }
        return {
          ...restLeaveType,
          total: 0,
          used,
          remaining: 0,
        };
      });

      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count,
        results,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.LEAVE_TYPE_MANAGEMENT, canCreate: true },
  ])
  @Post("/")
  public async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { name, regulationQuantity, orderNumber } = req.body;

      const { dataSource } = req.app.locals;
      const { session } = res.locals;
      const leaveTypeRepository = dataSource.getRepository(LeaveType);

      const leaveTypeExist: LeaveType | null =
        await leaveTypeRepository.findOneBy({ name });
      if (leaveTypeExist) {
        throw new NotAcceptableError("Leave Type name already exists");
      }

      // create a new leave type
      const leaveType: LeaveType = leaveTypeRepository.create({
        name,
        regulationQuantity: regulationQuantity
          ? Number(regulationQuantity)
          : undefined,
        orderNumber,
        createdBy: session.userId,
      });
      await leaveTypeRepository.save(leaveType);

      res.locals.message = "Leave Type created successfully";
      res.locals.data = {
        leaveType,
      };
      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.LEAVE_TYPE_MANAGEMENT, canUpdate: true },
  ])
  @Put("/:id")
  public async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { name, regulationQuantity, orderNumber } = req.body;

      const { dataSource } = req.app.locals;

      const leaveTypeRepository = dataSource.getRepository(LeaveType);

      const leaveType: LeaveType | null = await leaveTypeRepository.findOneBy({
        id,
      });
      if (!leaveType) {
        throw new NotFoundError("Leave Type is not found");
      }

      if (leaveType.createdBy === "migration") {
        throw new NotAcceptableError(
          "Cannot update leave type created by migration"
        );
      }

      if (name) {
        const leaveTypeExist: LeaveType | null =
          await leaveTypeRepository.findOneBy({ name });
        if (leaveTypeExist && leaveTypeExist.id !== id) {
          throw new NotAcceptableError("Leave Type name already exists");
        }
      }

      leaveTypeRepository.merge(leaveType, {
        name,
        regulationQuantity,
        orderNumber,
      });

      await leaveTypeRepository.save(leaveType);
      res.locals.message = "Leave Type updated successfully";
      res.locals.data = {
        position: {
          leaveType,
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.ANNUAL_LEAVE_MANAGEMENT, canUpdate: true },
  ])
  @Put("/employee/:id")
  public async updateRemainingAnnualLeave(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { quantity, year = new Date().getFullYear() } = req.body;

      const { dataSource } = req.app.locals;

      const remainingAnnualLeaveRepository =
        dataSource.getRepository(RemainingAnnualLeave);
      const employeeRepository = dataSource.getRepository(Employee);

      // Check if employee exists

      const employee = await employeeRepository.findOneBy({ id });
      if (!employee) {
        throw new NotFoundError("Employee is not found");
      }

      // Get Annual Leave
      const annualLeave = await remainingAnnualLeaveRepository.findOne({
        where: {
          employee: {
            id,
          },
          year: year.toString(),
        },
      });

      if (!annualLeave) {
        throw new NotFoundError(
          `Annual Leave information in ${year} is not found`
        );
      }
      remainingAnnualLeaveRepository.merge(annualLeave, { quantity });

      await remainingAnnualLeaveRepository.save(annualLeave);

      res.locals.message = "Remaining Annual Leave updated successfully";
      res.locals.data = {
        annualLeave,
      };
      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id")
  @Authorize([
    {
      permission: UserPermission.LEAVE_TYPE_MANAGEMENT,
      canDelete: true,
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

      const leaveTypeRepository = dataSource.getRepository(LeaveType);
      const leaveRequestRepository = dataSource.getRepository(LeaveRequest);

      const leaveType = await leaveTypeRepository.findOneBy({ id });
      if (!leaveType) {
        throw new NotFoundError("Leave type is not found.");
      }

      if (leaveType.createdBy === "migration") {
        throw new NotAcceptableError(
          "Cannot delete leave type created by migration"
        );
      }

      const leaveRequests: LeaveRequest[] = await leaveRequestRepository.find({
        where: {
          leaveType: {
            id,
          },
        },
        withDeleted: true,
      });
      if (leaveRequests.length > 0) {
        throw new NotAcceptableError(
          `Leave type ${leaveType.name} is in use. Please delete all leave requests related to this leave type before deleting it permanently.`
        );
      }

      await leaveTypeRepository.remove(leaveType);

      res.locals.message = "Leave Type successfully deleted permanently.";

      next();
    } catch (error) {
      next(error);
    }
  }
}

import { NextFunction, Request, Response } from "express";
import Controller from "../decorators/controller";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import { UserPermission } from "../utils/permission";
import { Get, Post, Put } from "../decorators/handlers";
import {
  Contract,
  ContractStatus,
  ContractTypes,
} from "../database/entities/Contract";
import { Employee } from "../database/entities/Employee";
import { BadRequestError, NotFoundError } from "../utils/errors";
import { omit, pick, removeEmptyValues } from "../utils";
import fs from "fs";
import path from "path";
import config from "../configuration";
import {
  RemainingAnnualLeave,
  RemainingAnnualLeaveStatus,
} from "../database/entities/RemainingAnnualLeave";
import { LeaveType } from "../database/entities/LeaveType";

@Controller("/contracts")
@Authenticate()
export default class ContractController {
  @Authorize([
    { permission: UserPermission.CONTRACT_MANAGEMENT, canCreate: true },
  ])
  @Post("/")
  public async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      let temp = req.body;
      temp = removeEmptyValues(temp);
      const {
        employeeId,
        contractNumber,
        contractType,
        workingType,
        startDate,
        endDate,
        contractFile,
        isRemote,
      } = temp;
      const { isSkip } = req.query;
      const { session } = res.locals;
      const { dataSource } = req.app.locals;

      if (!employeeId) {
        throw new BadRequestError("Employee ID is required.");
      }

      const employeeRepository = dataSource.getRepository(Employee);
      const remainingAnnualLeaveRepository =
        dataSource.getRepository(RemainingAnnualLeave);
      const leaveTypeRepository = dataSource.getRepository(LeaveType);

      const employee = await employeeRepository.findOneBy({
        id: employeeId,
      });
      if (!employee) {
        throw new NotFoundError("Employee was not found.");
      }

      const contractRepository = dataSource.getRepository(Contract);

      const isExistContractNumber = await contractRepository.findOneBy({
        no: contractNumber,
      });

      if (isExistContractNumber) {
        throw new BadRequestError("Contract number is already exist.");
      }

      if (isSkip === "false" || isSkip === "" || isSkip === undefined) {
        const existedContract: Contract | null =
          await contractRepository.findOne({
            where: {
              employee: {
                id: employeeId,
              },
              status: ContractStatus.ACTIVE,
            },
          });
        if (existedContract) {
          const newStartDate = new Date(startDate);
          const newEndDate = new Date(endDate);

          const existedStartDate = new Date(existedContract.startDate);
          const existedEndDate = new Date(existedContract.endDate);

          if (
            (newStartDate >= existedStartDate &&
              newStartDate <= existedEndDate) ||
            (newEndDate >= existedStartDate && newEndDate <= existedEndDate) ||
            (newStartDate <= existedStartDate && newEndDate >= existedEndDate)
          ) {
            res.locals.message =
              "The contract dates overlap with an existing contract.";
            return next();
          }
        }
      }

      const contract = contractRepository.create({
        employee,
        no: contractNumber,
        file: contractFile,
        isRemote: Boolean(isRemote),
        contractType,
        workingType,
        startDate,
        endDate,
        createdBy: session.userId,
        status: ContractStatus.ACTIVE,
      });
      await contractRepository.save(contract);

      // Set all remain contracts to EXPIRED
      const remainContracts = await contractRepository.find({
        where: {
          employee: {
            id: employeeId,
          },
          status: ContractStatus.ACTIVE,
        },
      });
      remainContracts.forEach((remainContract: Contract) => {
        if (remainContract.id !== contract.id) {
          remainContract.status = ContractStatus.EXPIRED;
        }
      });
      contractRepository.save(remainContracts);

      // LEAVE
      const annualLeaveType: LeaveType | null =
        await leaveTypeRepository.findOne({
          where: { name: "Annual leave" },
        });

      if (annualLeaveType) {
        const remainingAnnualLeaveExist: RemainingAnnualLeave | null =
          await remainingAnnualLeaveRepository.findOne({
            where: {
              employee: { id: employeeId },
              year: new Date().getFullYear().toString(),
            },
          });

        if (!remainingAnnualLeaveExist) {
          const remainingAnnualLeave = remainingAnnualLeaveRepository.create({
            employee,
            leaveType: annualLeaveType,
            quantity: 0,
            status:
              contract.contractType === ContractTypes.PROBATION
                ? RemainingAnnualLeaveStatus.DISABLED
                : RemainingAnnualLeaveStatus.ACTIVE,
            calculationDate: employee.joinDate,
            year: new Date().getFullYear().toString(),
          });
          await remainingAnnualLeaveRepository.save(remainingAnnualLeave);
        } else if (
          contract.contractType === ContractTypes.PROBATION &&
          remainingAnnualLeaveExist.status === RemainingAnnualLeaveStatus.ACTIVE
        ) {
          remainingAnnualLeaveExist.status =
            RemainingAnnualLeaveStatus.DISABLED;
          await remainingAnnualLeaveRepository.save(remainingAnnualLeaveExist);
        } else if (contract.contractType !== ContractTypes.PROBATION) {
          remainingAnnualLeaveExist.status = RemainingAnnualLeaveStatus.ACTIVE;
          await remainingAnnualLeaveRepository.save(remainingAnnualLeaveExist);
        }
      }

      res.locals.data = {
        contract: {
          ...omit(contract, [
            "createdBy",
            "updatedBy",
            "deletedBy",
            "createdAt",
            "updatedAt",
            "deletedAt",
            "employee",
          ]),
          employee: pick(employee, ["id", "fullName", "photo"]),
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.CONTRACT_MANAGEMENT, canRead: true },
  ])
  @Get("/employee/:employeeId")
  public async get(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;

      const {
        pageSize,
        pageIndex,
        sortBy = "startDate",
        orderBy = "DESC",
      } = req.query;

      const { employeeId } = req.params;
      const contractRepository = dataSource.getRepository(Contract);
      const employeeRepository = dataSource.getRepository(Employee);

      const employee: Employee | null = await employeeRepository.findOne({
        where: { id: employeeId },
      });

      if (!employee) {
        throw new NotFoundError("Employee is not found.");
      }

      const contractsQuery = contractRepository
        .createQueryBuilder("contract")
        .innerJoin("contract.employee", "employee")
        .where("contract.employeeId = :employeeId", { employeeId });

      // sort
      let objQuery: string = "contract";
      let objProperty: string = "updatedAt";

      if (sortBy !== "updatedAt") {
        switch (sortBy) {
          case "name": {
            objQuery = "employee";
            objProperty = "fullName";
            break;
          }
          case "startDate": {
            objProperty = "startDate";
            break;
          }
          case "endDate": {
            objProperty = "endDate";
            break;
          }
          case "status": {
            objProperty = "status";
            break;
          }
        }
      }

      contractsQuery.orderBy(
        `${objQuery}.${objProperty}`,
        orderBy === "asc" ? "ASC" : "DESC"
      );

      // pagination
      const count = await contractsQuery.getCount();

      if (pageSize && pageIndex) {
        contractsQuery
          .skip(Number(pageSize) * (Number(pageIndex) - 1))
          .take(Number(pageSize));
      }

      const allContracts = await contractsQuery
        .select([
          "contract.id",
          "contract.no",
          "contract.updatedAt",
          "contract.contractType",
          "contract.workingType",
          "contract.startDate",
          "contract.endDate",
          "contract.status",
          "contract.isRemote",
          "contract.file",
          "employee.id",
          "employee.fullName",
        ])
        .getMany();

      const flattenContracts = allContracts.map((contract: any) => {
        return {
          id: contract.id,
          updatedAt: contract.updatedAt,
          contractNumber: contract.no,
          contractType: contract.contractType,
          workingType: contract.workingType,
          startDate: contract.startDate,
          endDate: contract.endDate,
          status: contract.status,
          isRemote: contract.isRemote,
          contractFile: contract.file,
          employeeId: contract.employee.id,
          employeeFullName: contract.employee.fullName,
        };
      });

      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count,
        contracts: flattenContracts,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id")
  @Authorize([
    { permission: UserPermission.CONTRACT_MANAGEMENT, canUpdate: true },
  ])
  public async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const {
        contractFile,
        contractType,
        workingType,
        startDate,
        endDate,
        status,
        isRemote,
      } = req.body;
      const { dataSource } = req.app.locals;

      const contractRepository = dataSource.getRepository(Contract);
      const contract: Contract | null = await contractRepository.findOne({
        relations: ["employee"],
        where: {
          id,
        },
      });
      if (!contract) {
        throw new NotFoundError("Contract is not found.");
      }
      if (contractFile) {
        if (contract?.file && contract.file !== contractFile) {
          const fileName = contract?.file.split("/").pop() as string;
          if (fs.existsSync(path.join(config.upload_pdf_dir, fileName))) {
            fs.unlinkSync(path.join(config.upload_pdf_dir, fileName));
          }
        }
      }

      contractRepository.merge(contract, {
        contractType,
        workingType,
        startDate,
        endDate,
        status,
        isRemote,
        file: contractFile,
      });
      await contractRepository.save(contract);

      if (status === ContractStatus.ACTIVE) {
        const remainContracts = await contractRepository.find({
          where: {
            employee: {
              id: contract.employee.id,
            },
            status: ContractStatus.ACTIVE,
          },
        });
        remainContracts.forEach((remainContract: Contract) => {
          if (remainContract.id !== contract.id) {
            remainContract.status = ContractStatus.EXPIRED;
          }
        });
        contractRepository.save(remainContracts);
      }
      const formatData = {
        ...omit(contract, ["employee"]),
        employee: pick(contract.employee, [
          "id",
          "photo",
          "fullName",
          "employeeCode",
          "personalEmail",
        ]),
      };
      res.locals.message = "Update contract successfully.";
      res.locals.data = {
        ...formatData,
      };

      next();
    } catch (error) {
      next(error);
    }
  }
}

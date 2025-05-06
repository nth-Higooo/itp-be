import { NextFunction, Request, Response } from "express";
import Authenticate from "../decorators/authenticate";
import Controller from "../decorators/controller";
import { Put } from "../decorators/handlers";
import { Employee } from "../database/entities/Employee";
import { NotFoundError } from "../utils/errors";

@Controller("/onboarding")
@Authenticate()
export default class OnboardingController {
  // Step 2: Update general information
  @Put("/general-information")
  public async updateGeneralInformation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { session } = res.locals;

      const {
        dateOfBirth,
        gender,
        maritalStatus,
        personalEmail,
        phoneNumber,
        contactAddress,
        permanentAddress,
      } = req.body;

      const { dataSource } = req.app.locals;

      if (session.employeeId === null || session.employeeId === undefined) {
        throw new NotFoundError("Your employee information is not exist");
      }

      const employeeRepository = dataSource.getRepository(Employee);

      const employee: Employee | null = await employeeRepository.findOne({
        where: { id: session.employeeId },
      });
      if (!employee) {
        throw new NotFoundError("Your employee information is not exist");
      }

      employeeRepository.merge(employee, {
        dateOfBirth,
        gender,
        maritalStatus,
        personalEmail,
        phoneNumber,
        contactAddress,
        permanentAddress,
      });

      await employeeRepository.save(employee);

      res.locals.message = "Updated employee general information successfully";
      res.locals.data = {
        employee,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  // Step 3: Update government contact information
  @Put("/government-information")
  public async updateGovernmentInformation(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { vneIDNo, vneIDDate, vneIDPlace, pitNo, siNo } = req.body;
      const { session } = res.locals;
      const { dataSource } = req.app.locals;

      const employeeRepository = dataSource.getRepository(Employee);

      const employee: Employee | null = await employeeRepository.findOne({
        where: { id: session.employeeId },
      });
      if (!employee) {
        throw new NotFoundError("Your employee information is not exist");
      }

      employeeRepository.merge(employee, {
        vneIDNo,
        vneIDDate,
        vneIDPlace,
        pitNo,
        siNo,
      });
      await employeeRepository.save(employee);

      res.locals.message = "Updated government information successfully";
      res.locals.data = {
        employee,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  //Step 4: Update bank information
  @Put("/bank-account")
  public async updateBankAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { bankName, bankBranch, bankAccountName, bankAccountNumber } =
        req.body;
      const { session } = res.locals;
      const { dataSource } = req.app.locals;

      const employeeRepository = dataSource.getRepository(Employee);
      const employee: Employee | null = await employeeRepository.findOne({
        where: { id: session.employeeId },
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

      res.locals.message =
        "Update employee bank account information successfully";

      // Save Employee
      res.locals.data = {
        employee,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  //Step 5: Update employee emergency contact information
  @Put("/ec-info")
  public async updateECInfo(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        ecName,
        ecRelationship,
        ecPhoneNumber,
        fingerprintId,
        payslipPassword,
      } = req.body;
      const { session } = res.locals;
      const { dataSource } = req.app.locals;

      const employeeRepository = dataSource.getRepository(Employee);
      const employee: Employee | null = await employeeRepository.findOne({
        where: { id: session.employeeId },
      });
      if (!employee) {
        throw new NotFoundError("Employee was not found.");
      }

      employeeRepository.merge(employee, {
        ecName,
        ecRelationship,
        ecPhoneNumber,
        fingerprintId,
        payslipPassword,
      });
      await employeeRepository.save(employee);

      res.locals.message =
        "Updated employee emergency contact information successfully";
      // Save Employee
      res.locals.data = {
        employee,
      };

      next();
    } catch (error) {
      next(error);
    }
  }
}

import { NextFunction, Request, Response } from "express";
import Controller from "../decorators/controller";
import { Get, Post } from "../decorators/handlers";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "../utils/errors";
import { User, UserStatus } from "../database/entities/User";
import { compareSync } from "bcryptjs";
import { verify } from "jsonwebtoken";
import {
  decryptSalary,
  generateUniqueString,
  getAccessToken,
  getHashPassword,
  getRefreshToken,
  omit,
  validateEmail,
  validatePassword,
} from "../utils";
import { Session } from "../database/entities/Session";
import config from "../configuration";
import { sendMail } from "../utils/email";
import { getRolesAndPermissionsByUser } from "../database/repositories/auth.repository";
import { Employee } from "../database/entities/Employee";
import Authorize from "../decorators/authorize";
import { EmployeeDepartment } from "../database/entities/EmployeeDepartment";
import { IDepartment, IProject } from "../utils/interfaces";
import { ProjectEmployee } from "../database/entities/ProjectEmployee";
import fs from "fs";
import path from "path";
import { benefitFields, salaryFields } from "../utils/constants";

@Controller("/")
export default class AuthController {
  @Post("/register")
  public async register(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password } = req.body;
      const { dataSource } = req.app.locals;
      const userRepository = dataSource.getRepository(User);

      // validate
      if (!(email && validateEmail(email))) {
        throw new BadRequestError("Please enter an valid email address.");
      }
      const existEmail = await userRepository.findOneBy({ email });
      if (existEmail) {
        throw new BadRequestError("The email already exists.");
      }
      if (!password) {
        throw new BadRequestError("Please enter your password.");
      }
      if (password && !validatePassword(password)) {
        throw new BadRequestError("Password does not meet requirements.");
      }

      const user = userRepository.create({
        email,
        hashPassword: getHashPassword(password),
      });

      await userRepository.save(user);

      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/login")
  public async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password } = req.body;
      const { dataSource } = req.app.locals;

      const userRepository = dataSource.getRepository(User);
      const sessionRepository = dataSource.getRepository(Session);
      const employeeRepository = dataSource.getRepository(Employee);
      const employeeDepartmentRepository =
        dataSource.getRepository(EmployeeDepartment);
      const projectEmployeeRepository =
        dataSource.getRepository(ProjectEmployee);

      // validate
      if (!(email && validateEmail(email))) {
        throw new BadRequestError("Please enter an valid email address.");
      }
      const user = await userRepository.findOneBy({
        email,
      });

      if (!user) {
        throw new NotFoundError("Email was not found.");
      }

      const statusAbleToLogin = [UserStatus.ACTIVE, UserStatus.PENDING];
      if (!statusAbleToLogin.includes(user.status)) {
        throw new ForbiddenError(
          `The account is ${user.status.toLowerCase()}.`
        );
      }
      if (!password) {
        throw new BadRequestError("Please enter your password.");
      }
      if (!compareSync(password, user.hashPassword)) {
        throw new BadRequestError("Incorrect password. Please try again.");
      }

      const employee = await employeeRepository.findOneBy({
        user: {
          id: user.id,
        },
      });

      let departments: IDepartment[] = [];
      let projects: IProject[] = [];
      if (employee) {
        const employeesDepartments: EmployeeDepartment[] =
          await employeeDepartmentRepository
            .createQueryBuilder("employees_departments_one")
            .leftJoinAndSelect(
              "employees_departments_one.department",
              "department"
            )
            .leftJoinAndSelect("employees_departments_one.employee", "employee")
            .where("employee.id = :employeeId", { employeeId: employee.id })
            .leftJoinAndSelect(
              "department.employees",
              "employees_departments_two"
            )
            .leftJoinAndSelect(
              "employees_departments_two.employee",
              "employees"
            )
            .select([
              "employees_departments_one",
              "department",
              "employee.id",
              "employees_departments_two",
              "employees.id",
            ])
            .getMany();

        if (employeesDepartments.length > 0) {
          departments = employeesDepartments.map(
            (item: EmployeeDepartment) => ({
              id: item.department.id,
              isManager: item.isManager,
              managerId: item.isManager
                ? item.employee.id
                : item.department.employees.find(
                    (item: EmployeeDepartment) => item.isManager
                  )?.employee.id,
              employeeIds: item.department.employees
                .filter((item: EmployeeDepartment) => item?.employee?.id)
                .map((item: EmployeeDepartment) => item.employee.id),
            })
          );
        }

        const projectsEmployees: ProjectEmployee[] =
          await projectEmployeeRepository
            .createQueryBuilder("projects_employees")
            .where("projects_employees.employeeId = :employeeId", {
              employeeId: employee.id,
            })
            .leftJoinAndSelect("projects_employees.project", "project")
            .leftJoinAndSelect("project.projectManager", "projectManager")
            .leftJoinAndSelect("project.projectEmployees", "projectEmployees")
            .leftJoinAndSelect("projectEmployees.employee", "employees")
            .select([
              "projects_employees",
              "project.id",
              "projectManager.id",
              "projectEmployees",
              "employees.id",
            ])
            .getMany();

        if (projectsEmployees.length > 0) {
          projects = projectsEmployees.map((item: ProjectEmployee) => ({
            id: item.project.id,
            isProjectManager: item.isProjectManager,
            projectManagerId: item.project.projectManager?.id,
            employeeIds: item.project.projectEmployees
              .filter((item: ProjectEmployee) => item?.employee?.id)
              .map((item: ProjectEmployee) => item.employee.id),
          }));
        }
      }

      const accessToken = getAccessToken(user.id);
      const refreshToken = getRefreshToken(user.id);
      const session = sessionRepository.create({
        user,
        email: user.email,
        accessToken,
        refreshToken,
        employeeId: employee ? employee.id : null,
        departments,
        projects,
        userAgent: req.get("User-Agent"),
      } as Session);

      await sessionRepository.save(session);

      res.cookie("__refreshToken", refreshToken, { httpOnly: true });
      const { hashPassword, resetToken, ...restUser } = user;
      res.locals.data = {
        user: restUser,
        tess: 1,
      };
      const allRoleAndPermission = await getRolesAndPermissionsByUser({
        dataSource,
        userId: user.id,
      });
      res.locals.session = {
        userId: user.id,
        employeeId: session.employeeId,
        departments,
        projects,
        ...allRoleAndPermission,
        accessToken: session.accessToken,
      };
      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/refresh")
  public async refresh(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { __refreshToken: refToken } = req.cookies;
      const { dataSource } = req.app.locals;

      verify(refToken, config.jwtRefreshKey);

      const sessionRepository = dataSource.getRepository(Session);
      const session = await sessionRepository.findOneBy({
        refreshToken: refToken,
      });
      if (!session) {
        throw new BadRequestError("Session was not found.");
      }
      const newToken = getAccessToken(session.user.id);
      session.accessToken = newToken;
      const results = await sessionRepository.save(session);

      const allRoleAndPermission = await getRolesAndPermissionsByUser({
        dataSource,
        userId: session.user.id,
      });
      res.locals.session = {
        ...allRoleAndPermission,
        accessToken: results.accessToken,
      };
      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/forgot-password")
  public async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email } = req.body;
      const { dataSource, nodeMailer } = req.app.locals;

      const userRepository = dataSource.getRepository(User);
      const user = await userRepository.findOneBy({
        email,
      });
      if (!user) {
        throw new NotFoundError("The email was not found.");
      }

      // TODO: send mail
      const resetToken = generateUniqueString();
      const urlReset = `${config.clientSite}/auth/new-password/${resetToken}`;
      await sendMail({
        nodeMailer,
        emails: user.email,
        template: "ForgotPassword",
        data: {
          subject: "[ITPHRMS] A request change password",
          email: user.email,
          urlReset,
        },
      });

      userRepository.merge(user, {
        resetToken,
      });
      await userRepository.save(user);

      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/new-password")
  public async setPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { password, resetToken } = req.body;
      const { dataSource } = req.app.locals;

      const userRepository = dataSource.getRepository(User);
      const sessionRepository = dataSource.getRepository(Session);
      const employeeRepository = dataSource.getRepository(Employee);
      const user = await userRepository.findOneBy({
        resetToken,
      });
      if (!user) {
        throw new NotFoundError("The token was not found.");
      }

      if (!password) {
        throw new BadRequestError("Please enter your password.");
      }
      if (password && !validatePassword(password)) {
        throw new BadRequestError("Password does not meet requirements.");
      }

      userRepository.merge(user, {
        hashPassword: getHashPassword(password),
        resetToken: "",
        status: UserStatus.ACTIVE,
      });

      await userRepository.save(user);

      const employee = await employeeRepository.findOneBy({
        user: {
          id: user.id,
        },
      });
      const accessToken = getAccessToken(user.id);
      const refreshToken = getRefreshToken(user.id);
      const session = sessionRepository.create({
        user,
        email: user.email,
        accessToken,
        refreshToken,
        employeeId: employee ? employee.id : null,
        userAgent: req.get("User-Agent"),
      } as Session);

      await sessionRepository.save(session);

      res.cookie("__refreshToken", refreshToken, { httpOnly: true });
      res.locals.data = {
        user: omit(user, ["hashPassword", "resetToken", "activeToken"]),
      };
      const allRoleAndPermission = await getRolesAndPermissionsByUser({
        dataSource,
        userId: user.id,
      });
      res.locals.session = {
        userId: user.id,
        employeeId: session.employeeId,
        ...allRoleAndPermission,
        accessToken: session.accessToken,
      };
      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/change-password")
  public async changePassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body;
      const { dataSource } = req.app.locals;
      const { session } = res.locals;
      const userRepository = dataSource.getRepository(User);

      const decode: any = verify(session.accessToken, config.jwtAccessKey);

      const user = await userRepository.findOneBy({
        id: decode.iss,
      });

      if (!user) {
        throw new BadRequestError("User not found");
      }
      if (user.status !== UserStatus.ACTIVE) {
        throw new ForbiddenError("User not active");
      }

      if (!compareSync(currentPassword, user.hashPassword)) {
        throw new BadRequestError("Current password is incorrect");
      }

      user.hashPassword = getHashPassword(newPassword);
      await userRepository.save(user);

      res.locals.message = "Change password successfully";
      res.locals.session = null;
      next();
    } catch (error) {
      next(error);
    }
  }
  @Get("/me")
  @Authorize()
  public async getMe(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { session } = res.locals;

      const userRepository = dataSource.getRepository(User);
      const employeeRepository = dataSource.getRepository(Employee);

      const user: User | null = await userRepository.findOneBy({
        id: session.userId,
      });
      if (!user) {
        throw new NotFoundError("User account is not found.");
      }

      const employee: Employee | null = await employeeRepository
        .createQueryBuilder("employee")
        .where("employee.id = :employeeId", { employeeId: session.employeeId })
        .leftJoinAndSelect("employee.position", "position")
        .leftJoinAndSelect("employee.departments", "employees_departments")
        .leftJoinAndSelect("employees_departments.department", "departments")
        .leftJoinAndSelect(
          "employees_departments.employee",
          "managers",
          "employees_departments.isManager = true"
        )
        .select([
          "employee",
          "position.id",
          "position.name",
          "position.level",
          "position.parentId",
          "employees_departments",
          "departments.id",
          "departments.name",
          "managers",
        ])
        .getOne();

      let currentOnboardingStep = -1; // finished onboarding

      if (employee) {
        if (
          !employee.dateOfBirth ||
          !employee.gender ||
          !employee.maritalStatus ||
          !employee.personalEmail ||
          !employee.phoneNumber ||
          !employee.contactAddress ||
          !employee.permanentAddress
        ) {
          currentOnboardingStep = 2;
        } else if (
          !employee.vneIDNo ||
          !employee.vneIDDate ||
          !employee.vneIDPlace ||
          !employee.pitNo ||
          !employee.siNo
        ) {
          currentOnboardingStep = 3;
        } else if (
          !employee.bankName ||
          !employee.bankBranch ||
          !employee.bankAccountName ||
          !employee.bankAccountNumber
        ) {
          currentOnboardingStep = 4;
        } else if (
          !employee.ecRelationship ||
          !employee.ecName ||
          !employee.ecPhoneNumber ||
          !employee.fingerprintId ||
          !employee.payslipPassword
        ) {
          currentOnboardingStep = 5;
        }
      } else {
        currentOnboardingStep = 0; // not exist employee
      }

      const temp: any = employee;

      res.locals.message = "Get employee information successfully.";
      res.locals.data = {
        currentOnboardingStep,
        user: {
          ...omit(user, ["hashPassword", "resetToken", "activeToken"]),
          employee: employee && {
            ...omit(employee, ["departments"]),
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
            ...salaryFields.reduce((acc: any, key: string) => {
              if (temp[key]) {
                acc[key] = decryptSalary(temp[key]);
              }
              return acc;
            }, {}),
            ...benefitFields.reduce((acc: any, key: string) => {
              if (temp[key]) {
                acc[key] = decryptSalary(temp[key]);
              }
              return acc;
            }, {}),
          },
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/me")
  @Authorize()
  public async updateMe(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { avatar } = req.body;
      const { dataSource } = req.app.locals;
      const { session } = res.locals;
      const userRepository = dataSource.getRepository(User);

      const user = await userRepository.findOneBy({ id: session.userId });

      if (!user) {
        throw new NotFoundError("User is not found.");
      }

      if (avatar) {
        if (user?.avatar && user.avatar !== avatar) {
          const fileName = user?.avatar.split("/").pop() as string;
          if (fs.existsSync(path.join(config.upload_image_dir, fileName))) {
            fs.unlinkSync(path.join(config.upload_image_dir, fileName));
          }
        }
      }
      userRepository.merge(user, { avatar });
      res.locals.data = {
        user: await userRepository.save(user),
      };

      next();
    } catch (error) {
      next(error);
    }
    next();
  }
}

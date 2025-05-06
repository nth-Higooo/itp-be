import { NextFunction, Request, Response } from "express";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import Controller from "../decorators/controller";
import { Delete, Get, Post, Put } from "../decorators/handlers";
import { UserPermission } from "../utils/permission";
import { Department, DepartmentType } from "../database/entities/Department";
import { EmployeeDepartment } from "../database/entities/EmployeeDepartment";
import { Employee } from "../database/entities/Employee";
import { NotAcceptableError, NotFoundError } from "../utils/errors";
import { In, IsNull, Not } from "typeorm";
import { omit, pick } from "../utils";

@Controller("/departments")
@Authenticate()
export default class DepartmentController {
  @Authorize([
    { permission: UserPermission.DEPARTMENT_MANAGEMENT, canRead: true },
  ])
  @Get("/:id")
  public async getById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;

      const departmentRepository = dataSource.getRepository(Department);
      const employeeDepartmentRepository =
        dataSource.getRepository(EmployeeDepartment);

      const department: Department | null = await departmentRepository
        .createQueryBuilder("departments")
        .where("departments.id = :id", { id })
        .leftJoinAndSelect("departments.employees", "employees_departments")
        .getOne();
      if (!department) {
        throw new NotFoundError("Department is not found");
      }

      const employeeDepartment: EmployeeDepartment | null =
        await employeeDepartmentRepository.findOne({
          relations: ["department", "employee"],
          where: { department: { id }, isManager: true },
        });

      res.locals.data = {
        department: {
          ...omit(department, ["employees"]),
          employeeQuantity: department.employees.length,
          manager: employeeDepartment?.employee,
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.DEPARTMENT_MANAGEMENT, canRead: true },
  ])
  @Get("/")
  public async get(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { pageSize, pageIndex, search, isFilter = false } = req.query;

      const departmentRepository = dataSource.getRepository(Department);
      const employeeRepository = dataSource.getRepository(Employee);

      const countEmployee = await employeeRepository.count();

      const [parentDepartments, count] = await departmentRepository
        .createQueryBuilder("departments")
        .leftJoinAndSelect("departments.employees", "employees_departments")
        .leftJoinAndSelect(
          "employees_departments.employee",
          "employee",
          "employee.deletedAt IS NULL"
        )
        .where(isFilter ? "1=1" : "departments.parentId IS NULL")
        .andWhere(search ? "departments.name ILIKE :search" : "1=1", {
          search: `%${search}%`,
        })
        .orderBy("departments.orderNumber", "ASC")
        .skip(
          pageIndex && pageSize
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined
        )
        .take(pageIndex && pageSize ? Number(pageSize) : undefined)
        .select(["departments", "employees_departments", "employee"])
        .getManyAndCount();

      let departments: any[] = parentDepartments.map(
        (parentDepartment: Department) => ({
          ...omit(parentDepartment, ["employees"]),
        })
      );

      if (!isFilter) {
        const parentDepartmentsIds: string[] = parentDepartments.map(
          (parentDepartment: Department) => parentDepartment.id
        );

        const childrenDepartment: Department[] = parentDepartmentsIds.length
          ? await departmentRepository
              .createQueryBuilder("departments")
              .where("departments.parentId IN (:...parentDepartmentsIds)", {
                parentDepartmentsIds,
              })
              .leftJoinAndSelect(
                "departments.employees",
                "employees_departments"
              )
              .leftJoinAndSelect("employees_departments.employee", "employee")
              .getMany()
          : [];

        const childrenMap = new Map<string, any[]>();
        childrenDepartment.forEach((childDepartment: Department) => {
          const parentId = childDepartment.parentId!;

          if (!childrenMap.has(parentId)) {
            childrenMap.set(parentId, []);
          }

          let manager = null;
          if (childDepartment.employees.length > 0) {
            manager = childDepartment.employees.find(
              (employeeDepartment: EmployeeDepartment) =>
                employeeDepartment.isManager
            )?.employee;

            if (manager) {
              manager = pick(manager, ["id", "fullName", "photo"]);
            }
          }

          childrenMap.get(parentId)!.push({
            id: childDepartment.id,
            name: childDepartment.name,
            orderNumber: childDepartment.orderNumber,
            parentId: childDepartment.parentId,
            type: childDepartment.type,
            employeeQuantity: childDepartment.employees.filter(
              (employeeDepartment: EmployeeDepartment) =>
                employeeDepartment.employee
            ).length,
            manager: manager || null,
          });
        });

        departments = parentDepartments.map((parentDepartment: Department) => {
          let manager = null;
          if (parentDepartment.employees.length > 0) {
            manager = parentDepartment.employees.find(
              (employeeDepartment: EmployeeDepartment) =>
                employeeDepartment.isManager
            )?.employee;

            if (manager) {
              manager = pick(manager, ["id", "fullName", "photo"]);
            }
          }

          return {
            id: parentDepartment.id,
            name: parentDepartment.name,
            orderNumber: parentDepartment.orderNumber,
            parentId: parentDepartment.parentId,
            type: parentDepartment.type,
            employeeQuantity: parentDepartment.employees.filter(
              (employeeDepartment: EmployeeDepartment) =>
                employeeDepartment.employee
            ).length,
            manager: manager || null,
            childrenDepartment: childrenMap.get(parentDepartment.id) || [],
          };
        });
      }

      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count,
        employeeQuantity: countEmployee,
        departments,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.DEPARTMENT_MANAGEMENT, canCreate: true },
  ])
  @Post("/")
  public async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { name, orderNumber, parentId, managerId, type } = req.body;
      const { dataSource } = req.app.locals;

      const departmentRepository = dataSource.getRepository(Department);
      const employeeRepository = dataSource.getRepository(Employee);
      const employeeDepartmentRepository =
        dataSource.getRepository(EmployeeDepartment);

      if (parentId) {
        const parentDepartment: Department | null =
          await departmentRepository.findOneBy({ id: parentId });

        if (!parentDepartment) {
          throw new NotFoundError("Parent department is not found");
        }
      }

      let manager: Employee | null = null;
      if (managerId) {
        manager = await employeeRepository.findOneBy({
          id: managerId,
        });

        if (!manager) {
          throw new NotFoundError("Manager is not found");
        }
      }

      const departmentExist: Department | null =
        await departmentRepository.findOne({
          where: { name, parentId: parentId ? parentId : IsNull() },
        });
      if (departmentExist) {
        throw new NotAcceptableError(
          "Department name already exists in the same level"
        );
      }

      // Department type
      const isTypeValid = Object.values(DepartmentType).includes(type);
      if (!isTypeValid) {
        throw new NotAcceptableError("Department type is invalid");
      }

      //   create a new department
      const department = departmentRepository.create({
        name,
        orderNumber,
        parentId: parentId || undefined,
        type,
      });
      await departmentRepository.save(department);

      //   create a new employee department
      if (manager) {
        const employeeDepartment = employeeDepartmentRepository.create({
          employee: manager,
          department,
          isManager: true,
        });
        await employeeDepartmentRepository.save(employeeDepartment);
      }

      res.locals.message = "Department is created successfully";
      res.locals.data = {
        department: {
          ...department,
          manager: manager && pick(manager, ["id", "fullName", "photo"]),
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.DEPARTMENT_MANAGEMENT, canUpdate: true },
  ])
  @Put("/:id")
  public async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;
      const { name, orderNumber, parentId, managerId, type } = req.body;

      const departmentRepository = dataSource.getRepository(Department);
      const employeeRepository = dataSource.getRepository(Employee);
      const employeeDepartmentRepository =
        dataSource.getRepository(EmployeeDepartment);

      const department: Department | null =
        await departmentRepository.findOneBy({ id });
      if (!department) {
        throw new NotFoundError("Department is not found");
      }

      if (parentId) {
        const parentDepartment: Department | null =
          await departmentRepository.findOneBy({ id: parentId });

        if (!parentDepartment) {
          throw new NotFoundError("Parent department is not found");
        }
      }

      let manager: Employee | null = null;
      if (managerId) {
        manager = await employeeRepository.findOneBy({
          id: managerId,
        });

        if (!manager) {
          throw new NotFoundError("Manager is not found");
        }
      }

      // Department type
      if (type) {
        const isTypeValid = Object.values(DepartmentType).includes(type);
        if (!isTypeValid) {
          throw new NotAcceptableError("Department type is invalid");
        }
      }
      const departmentExist: Department | null =
        await departmentRepository.findOne({
          where: {
            id: Not(id),
            name,
            parentId: parentId || undefined,
          },
        });
      if (departmentExist) {
        throw new NotAcceptableError(
          "Department name already exists in the same level"
        );
      }

      departmentRepository.merge(department, {
        name,
        orderNumber,
        parentId:
          parentId !== "" && parentId !== department.id ? parentId : undefined,
        type,
      });
      await departmentRepository.save(department);

      const employeeDepartment: EmployeeDepartment | null =
        await employeeDepartmentRepository.findOneBy({
          department,
          isManager: true,
        });

      if (employeeDepartment) {
        if (manager) {
          employeeDepartmentRepository.merge(employeeDepartment, {
            employee: manager,
          });
          await employeeDepartmentRepository.save(employeeDepartment);
        } else {
          await employeeDepartmentRepository.delete(employeeDepartment.id);
        }
      } else if (manager) {
        const newEmployeeDepartment = employeeDepartmentRepository.create({
          employee: manager,
          department,
          isManager: true,
        });
        await employeeDepartmentRepository.save(newEmployeeDepartment);
      }

      res.locals.message = "Department is updated successfully";
      res.locals.data = {
        department: {
          ...department,
          manager,
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id/permanently")
  @Authorize([
    {
      permission: UserPermission.DEPARTMENT_MANAGEMENT,
      canPermanentlyDelete: true,
    },
  ])
  public async delete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;

      const departmentRepository = dataSource.getRepository(Department);
      const employeeDepartmentRepository =
        dataSource.getRepository(EmployeeDepartment);

      const department: Department | null =
        await departmentRepository.findOneBy({ id });
      if (!department) {
        throw new NotFoundError("Department is not found.");
      }

      const childrenDepartment: Department[] =
        await departmentRepository.findBy({ parentId: id });
      if (childrenDepartment.length > 0) {
        const childDepartmentIds = childrenDepartment.map(
          (childDepartment) => childDepartment.id
        );

        const childEmployeesDepartments: EmployeeDepartment[] =
          await employeeDepartmentRepository.findBy({
            department: { id: In(childDepartmentIds) },
          });

        if (childEmployeesDepartments.length > 0) {
          await employeeDepartmentRepository.remove(childEmployeesDepartments);
        }

        await departmentRepository.remove(childrenDepartment);
      }

      const employeesDepartments: EmployeeDepartment[] =
        await employeeDepartmentRepository.findBy({ department: { id } });
      if (employeesDepartments.length > 0) {
        await employeeDepartmentRepository.remove(employeesDepartments);
      }

      await departmentRepository.remove(department);

      res.locals.message = "Department successfully deleted permanently.";

      next();
    } catch (error) {
      next(error);
    }
  }
}

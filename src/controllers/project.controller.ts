import { Request, Response, NextFunction } from "express";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import Controller from "../decorators/controller";
import { Delete, Get, Post, Put } from "../decorators/handlers";
import { UserPermission } from "../utils/permission";
import { Project, ProjectStatus } from "../database/entities/Project";
import { FindManyOptions, ILike, In, IsNull, Not } from "typeorm";
import { Department } from "../database/entities/Department";
import { NotAcceptableError, NotFoundError } from "../utils/errors";
import { ProjectEmployee } from "../database/entities/ProjectEmployee";
import { Market } from "../database/entities/Market";
import { Employee } from "../database/entities/Employee";
import { Skill } from "../database/entities/Skill";
import { omit } from "../utils";

@Controller("/projects")
@Authenticate()
export default class ProjectController {
  @Get("/")
  @Authorize([{ permission: UserPermission.PROJECT_MANAGEMENT, canRead: true }])
  public async index(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const {
        pageSize,
        pageIndex,
        status,
        department,
        name,
        sortBy = "name",
        orderBy = "asc",
      } = req.query;

      const projectRepository = dataSource.getRepository(Project);

      let criteria: FindManyOptions<Project> = {
        skip:
          pageSize && pageIndex
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined,
        take: pageSize && pageIndex ? Number(pageSize) : undefined,
        relations: {
          department: true,
          market: true,
          projectManager: true,
          accountManager: true,
        },
        where: {},
        select: {
          market: {
            id: true,
            name: true,
          },
          projectManager: {
            id: true,
            fullName: true,
            photo: true,
          },
          accountManager: {
            id: true,
            fullName: true,
            photo: true,
          },
        },
      };

      if (sortBy) {
        criteria = {
          ...criteria,
          order: {
            [sortBy as string]: orderBy,
          },
        };
      }
      if (status && status !== "ALL") {
        if (status === "TRASH") {
          criteria = {
            ...criteria,
            withDeleted: true,
            where: {
              ...criteria.where,
              deletedAt: Not(IsNull()),
            },
          };
        } else if (status === "SALES") {
          criteria = {
            ...criteria,
            where: {
              ...criteria.where,
              status: In([
                ProjectStatus.INITIAL,
                ProjectStatus.PLANNING,
                ProjectStatus.EVALUATION,
                ProjectStatus.QUOTES,
                ProjectStatus.SIGN_CONTRACT,
                ProjectStatus.KICK_OFF,
                ProjectStatus.REJECT,
              ]),
            },
          };
        } else {
          criteria = {
            ...criteria,
            where: {
              ...criteria.where,
              status: ProjectStatus[status as keyof typeof ProjectStatus],
            },
          };
        }
      }
      if (name) {
        criteria = {
          ...criteria,
          where: {
            ...criteria.where,
            name: ILike(`%${name}%`),
          },
        };
      }
      if (department) {
        criteria = {
          ...criteria,
          where: {
            ...criteria.where,
            department: {
              id: department,
            } as Department,
          },
        };
      }

      const [projects, count] = await projectRepository.findAndCount(criteria);

      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count,
        projects,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Get("/count-all-status")
  @Authorize([{ permission: UserPermission.PROJECT_MANAGEMENT, canRead: true }])
  public async countAllStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const projectRepository = dataSource.getRepository(Project);

      const [totalSales, totalInProgress, totalEnd, totalDeleted] =
        await Promise.all([
          projectRepository.countBy({
            status: In([
              ProjectStatus.INITIAL,
              ProjectStatus.PLANNING,
              ProjectStatus.EVALUATION,
              ProjectStatus.QUOTES,
              ProjectStatus.SIGN_CONTRACT,
              ProjectStatus.KICK_OFF,
              ProjectStatus.REJECT,
            ]),
          }),
          projectRepository.countBy({ status: ProjectStatus.IN_PROGRESS }),
          projectRepository.countBy({ status: ProjectStatus.ARCHIVE }),
          projectRepository.count({
            where: { deletedAt: Not(IsNull()) },
            withDeleted: true,
          }),
        ]);
      res.locals.data = {
        total: totalSales + totalInProgress + totalEnd,
        totalSales,
        totalInProgress,
        totalEnd,
        totalDeleted,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Get("/kanban")
  @Authorize([
    {
      permission: UserPermission.PROJECT_MANAGEMENT,
      canViewPartial: true,
    },
  ])
  public async sales(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const projectRepository = dataSource.getRepository(Project);

      const [
        projectInitial,
        projectPlanning,
        projectEvaluation,
        projectQuotes,
        projectSignContract,
        projectKickOff,
        projectReject,
      ] = await Promise.all([
        projectRepository.findBy({ status: ProjectStatus.INITIAL }),
        projectRepository.findBy({ status: ProjectStatus.PLANNING }),
        projectRepository.findBy({ status: ProjectStatus.EVALUATION }),
        projectRepository.findBy({ status: ProjectStatus.QUOTES }),
        projectRepository.findBy({ status: ProjectStatus.SIGN_CONTRACT }),
        projectRepository.findBy({ status: ProjectStatus.KICK_OFF }),
        projectRepository.findBy({ status: ProjectStatus.REJECT }),
      ]);

      res.locals.data = {
        projectInitial,
        projectPlanning,
        projectEvaluation,
        projectQuotes,
        projectSignContract,
        projectKickOff,
        projectReject,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id")
  @Authorize([
    {
      permission: UserPermission.PROJECT_MANAGEMENT,
      canUpdate: true,
    },
  ])
  public async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const {
        name,
        status,
        clientName,
        department,
        market,
        projectManager,
        accountManager,
        type,
        business,
        technologies,
        startDate,
        endDate,
        communicationChannels,
        notes,
      } = req.body;

      const { dataSource } = req.app.locals;
      const projectRepository = dataSource.getRepository(Project);
      const departmentRepository = dataSource.getRepository(Department);
      const marketRepository = dataSource.getRepository(Market);
      const employeeRepository = dataSource.getRepository(Employee);
      const project = await projectRepository.findOne({
        where: { id },
      });

      if (!project) {
        throw new NotFoundError("Project is not found.");
      }

      if (name) {
        const nameExist = await projectRepository.findOne({
          where: { name: name, id: Not(id) },
        });
        if (nameExist) {
          throw new NotAcceptableError("Name already in use.");
        }
      }

      if (department) {
        const isDepartmentExist = await departmentRepository.findOneBy({
          id: department,
        });
        if (!isDepartmentExist) {
          throw new NotAcceptableError("Department not found.");
        }
      }

      if (market) {
        const isMarketExist = await marketRepository.findOneBy({
          id: market,
        });
        if (!isMarketExist) {
          throw new NotAcceptableError("Market not found.");
        }
      }
      if (projectManager) {
        const isProjectManagerExist = await employeeRepository.findOneBy({
          id: projectManager,
        });
        if (!isProjectManagerExist) {
          throw new NotAcceptableError("Project Manager not found.");
        }
      }
      if (accountManager) {
        const isAccountManagerExist = await employeeRepository.findOneBy({
          id: accountManager,
        });
        if (!isAccountManagerExist) {
          throw new NotAcceptableError("Account Manager not found.");
        }
      }

      projectRepository.merge(project, {
        name,
        status,
        clientName,
        type,
        business,
        technologies,
        startDate,
        endDate,
        communicationChannels,
        notes,
        department,
        market,
        projectManager,
        accountManager,
      });

      await projectRepository.save(project);

      res.locals.data = {
        project,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Get("/:id")
  @Authorize([{ permission: UserPermission.PROJECT_MANAGEMENT, canRead: true }])
  public async findById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;
      const projectRepository = dataSource.getRepository(Project);

      const project = await projectRepository.findOne({
        relations: {
          market: true,
          projectManager: true,
          accountManager: true,
          department: true,
          projectEmployees: {
            employee: {
              skills: {
                skillLevel: {
                  skillType: true,
                },
              },
            },
          },
        },
        where: { id },
        select: {
          market: {
            id: true,
            name: true,
          },
          projectManager: {
            id: true,
            fullName: true,
            photo: true,
          },
          accountManager: {
            id: true,
            fullName: true,
            photo: true,
          },
          projectEmployees: {
            id: true,
            isProjectManager: true,
            spendTime: true,
            employee: {
              id: true,
              fullName: true,
              photo: true,
              personalEmail: true,
              phoneNumber: true,
              skills: {
                isMainSkill: true,
                id: true,
                skillLevel: {
                  id: true,
                  skillType: {
                    id: true,
                    name: true,
                    skillName: true,
                  },
                },
              },
            },
          },
        },
      });

      if (!project) {
        throw new NotFoundError("Project is not found.");
      }

      const formatData: any = {
        ...omit(project, ["projectEmployees"]),
        projectEmployees: project.projectEmployees.map(
          (projectEmployee: ProjectEmployee) => {
            return {
              id: projectEmployee.id,
              employee: {
                ...omit(projectEmployee.employee, ["skills"]),
                mainSkill: projectEmployee.employee.skills.filter(
                  (skill: Skill) => skill.isMainSkill
                ),
                otherSkills: projectEmployee.employee.skills.filter(
                  (skill: Skill) => !skill.isMainSkill
                ),
              },
              isProjectManager: projectEmployee.isProjectManager,
              spendTime: projectEmployee.spendTime,
            };
          }
        ),
      };

      res.locals.data = {
        project: formatData,
      };
      next();
    } catch (error) {
      next(error);
    }
  }

  @Post("/")
  @Authorize([
    { permission: UserPermission.PROJECT_MANAGEMENT, canCreate: true },
  ])
  public async add(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const {
        name,
        status,
        clientName,
        department,
        market,
        projectManager,
        accountManager,
        type,
        business,
        technologies,
        startDate,
        endDate,
        communicationChannels,
        notes,
      } = req.body;
      const { session } = res.locals;
      const { dataSource } = req.app.locals;

      const projectRepository = dataSource.getRepository(Project);
      const departmentRepository = dataSource.getRepository(Department);
      const marketRepository = dataSource.getRepository(Market);
      const employeeRepository = dataSource.getRepository(Employee);
      const projectEmployeeRepository =
        dataSource.getRepository(ProjectEmployee);

      const nameExist = await projectRepository.findOneBy({ name });
      if (nameExist) {
        throw new NotAcceptableError("Name already in use.");
      }

      const isDepartmentExist = await departmentRepository.findOneBy({
        id: department,
      });
      if (!isDepartmentExist) {
        throw new NotAcceptableError("Department not found.");
      }

      const isMarketExist = await marketRepository.findOneBy({
        id: market,
      });
      if (!isMarketExist) {
        throw new NotAcceptableError("Market not found.");
      }

      const isProjectManagerExist = await employeeRepository.findOneBy({
        id: projectManager,
      });
      if (!isProjectManagerExist) {
        throw new NotAcceptableError("Project Manager not found.");
      }

      const isAccountManagerExist = await employeeRepository.findOneBy({
        id: accountManager,
      });
      if (!isAccountManagerExist) {
        throw new NotAcceptableError("Account Manager not found.");
      }

      const project = projectRepository.create({
        name,
        status,
        clientName,
        type,
        business,
        technologies,
        startDate,
        endDate,
        communicationChannels,
        notes,
        department,
        market,
        projectManager,
        accountManager,
        createdBy: session.userId,
      });
      await projectRepository.save(project);

      const projectManagerObj = projectEmployeeRepository.create({
        project,
        employee: projectManager,
        isProjectManager: true,
        spendTime: 100,
      });
      const accountManagerObj = projectEmployeeRepository.create({
        project,
        employee: accountManager,
        isProjectManager: false,
        spendTime: 100,
      });
      await projectEmployeeRepository.save([
        projectManagerObj,
        accountManagerObj,
      ]);

      res.locals.data = {
        project,
      };

      next();
    } catch (error) {
      next(error);
    }
  }
  @Post("/:id/members")
  @Authorize([
    { permission: UserPermission.PROJECT_MANAGEMENT, canAddMember: true },
  ])
  public async addMember(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { members } = req.body;
      const { dataSource } = req.app.locals;
      const { id } = req.params;
      const employeeRepository = dataSource.getRepository(Employee);
      const projectEmployeeRepository =
        dataSource.getRepository(ProjectEmployee);
      const projectRepository = dataSource.getRepository(Project);

      const isProjectExist = await projectRepository.findOneBy({ id });
      if (!isProjectExist) {
        throw new NotFoundError("Project is not found.");
      }

      const employeeIds = members.map((member: any) => member.employeeId);
      const isMembersExist = await employeeRepository.find({
        where: {
          id: In(employeeIds),
        },
      });
      if (isMembersExist.length !== members.length) {
        throw new NotAcceptableError("Some members not found.");
      }

      const newManager = members.filter(
        (member: any) => member.isProjectManager
      ).length;

      const isExistProjectManager = await projectEmployeeRepository.find({
        where: {
          id,
          isProjectManager: true,
        },
      });
      if (newManager > 0 && isExistProjectManager) {
        throw new NotAcceptableError("Project Manager already exist.");
      }

      const projectEmployees = members.map((member: any) => {
        return projectEmployeeRepository.create({
          project: { id },
          employee: { id: member.employeeId },
          isProjectManager: member.isProjectManager,
          spendTime: member.spendTime,
        });
      });

      await projectEmployeeRepository.save(projectEmployees);
      res.locals.message = "Add members successfully.";
      res.locals.data = {
        projectEmployees,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id/members/:memberId")
  @Authorize([
    { permission: UserPermission.PROJECT_MANAGEMENT, canEditMember: true },
  ])
  public async updateMember(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { spendTime, isProjectManager } = req.body;
      const { dataSource } = req.app.locals;
      const { id, memberId } = req.params;
      const projectRepository = dataSource.getRepository(Project);
      const projectEmployeeRepository =
        dataSource.getRepository(ProjectEmployee);

      const isProjectExist = await projectRepository.findOneBy({ id });
      if (!isProjectExist) {
        throw new NotFoundError("Project is not found.");
      }

      const isMembersExist = await projectEmployeeRepository.findOne({
        where: {
          id: memberId,
        },
      });
      if (!isMembersExist) {
        throw new NotFoundError("Member is not found.");
      }

      const isExistProjectManager = await projectEmployeeRepository.find({
        where: {
          id,
          isProjectManager: true,
        },
      });
      if (isExistProjectManager && isProjectManager) {
        throw new NotAcceptableError("Project Manager already exist.");
      }

      projectEmployeeRepository.merge(isMembersExist, {
        spendTime,
        isProjectManager,
      });
      projectEmployeeRepository.save(isMembersExist);

      await projectEmployeeRepository.save(isMembersExist);
      res.locals.message = "Update member successfully.";
      res.locals.data = {
        isMembersExist,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id")
  @Authorize([
    { permission: UserPermission.PROJECT_MANAGEMENT, canDelete: true },
  ])
  public async delete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;
      const projectRepository = dataSource.getRepository(Project);

      const project = await projectRepository.findOneBy({ id });

      if (!project) {
        throw new NotFoundError("Project is not found.");
      }

      await projectRepository.softDelete({ id });

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id/permanently")
  @Authorize([
    {
      permission: UserPermission.PROJECT_MANAGEMENT,
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

      const projectRepository = dataSource.getRepository(Project);
      const projectEmployeeRepository =
        dataSource.getRepository(ProjectEmployee);

      const project: Project | null = await projectRepository
        .createQueryBuilder("project")
        .withDeleted()
        .where("project.id = :id", { id })
        .andWhere("project.deletedAt IS NOT NULL")
        .getOne();

      if (!project) {
        throw new NotFoundError("Project is not found.");
      }

      const projectEmployees: ProjectEmployee[] =
        await projectEmployeeRepository
          .createQueryBuilder("projects_employees")
          .withDeleted()
          .where('"projectId" = :id', { id })
          .getMany();
      await projectEmployeeRepository.remove(projectEmployees);
      await projectRepository.remove(project);

      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id/restore")
  @Authorize([
    { permission: UserPermission.PROJECT_MANAGEMENT, canRestore: true },
  ])
  public async restore(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;

      const projectRepository = dataSource.getRepository(Project);

      const project: Project | null = await projectRepository
        .createQueryBuilder("project")
        .withDeleted()
        .where("project.id = :id", { id })
        .andWhere("project.deletedAt IS NOT NULL")
        .getOne();

      if (!project) {
        throw new NotFoundError("Project is not found.");
      }

      await projectRepository.restore(project.id);

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id/members")
  @Authorize([
    { permission: UserPermission.PROJECT_MANAGEMENT, canRemoveMember: true },
  ])
  public async deleteMember(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { members } = req.body;
      const { dataSource } = req.app.locals;
      const { id } = req.params;
      const projectEmployeeRepository =
        dataSource.getRepository(ProjectEmployee);
      const projectRepository = dataSource.getRepository(Project);

      const isProjectExist = await projectRepository.findOneBy({ id });
      if (!isProjectExist) {
        throw new NotFoundError("Project is not found.");
      }
      await Promise.all(
        members.map(async (employeeId: string) => {
          return projectEmployeeRepository.delete({
            employee: {
              id: employeeId,
            },
            project: {
              id,
            },
          });
        })
      );

      res.locals.message = "Delete members successfully.";
      next();
    } catch (error) {
      next(error);
    }
  }
}

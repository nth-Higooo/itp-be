import { ILike } from "typeorm";
import Holiday from "../database/entities/Holiday";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import Controller from "../decorators/controller";
import { Delete, Get, Post, Put } from "../decorators/handlers";
import {
  BadRequestError,
  NotAcceptableError,
  NotFoundError,
} from "../utils/errors";
import { UserPermission } from "../utils/permission";
import { NextFunction, Request, Response } from "express";

@Controller("/holidays")
@Authenticate()
export default class HolidayController {
  @Authorize([{ permission: UserPermission.HOLIDAY_MANAGEMENT, canRead: true }])
  @Get("/")
  public async getListHolidays(
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
        year,
        sortBy = "startDate",
        orderBy = "asc",
      } = req.query;
      const holidayRepository = dataSource.getRepository(Holiday);

      // Build the base query
      let queryBuilder = holidayRepository
        .createQueryBuilder("holiday")
        .where(search ? "holiday.name ILIKE :search" : "1=1", {
          search: `%${search}%`,
        });
      // Validate and parse the year if provided
      if (year) {
        const parsedYear = Number(year);
        if (isNaN(parsedYear)) {
          throw new BadRequestError(`Invalid year value`);
        }
        queryBuilder = queryBuilder.andWhere(
          "(EXTRACT(YEAR FROM holiday.startDate) = :year OR EXTRACT(YEAR FROM holiday.endDate) = :year)",
          { year: parsedYear }
        );
      }

      //Get Holidays
      const holidays = await queryBuilder
        .orderBy(`holiday.${sortBy}`, orderBy === "asc" ? "ASC" : "DESC")
        .skip(
          pageSize && pageIndex
            ? Number(pageSize) * (Number(pageIndex) - 1)
            : undefined
        )
        .take(pageSize && pageIndex ? Number(pageSize) : undefined)
        .getMany();

      const count = await queryBuilder.getCount();
      res.locals.data = {
        pageSize: Number(pageSize),
        pageIndex: Number(pageIndex),
        count,
        holidays,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.HOLIDAY_MANAGEMENT, canCreate: true },
  ])
  @Post("/")
  public async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { name, startDate, endDate } = req.body;

      const { dataSource } = req.app.locals;
      const { session } = res.locals;
      const holidayRepository = dataSource.getRepository(Holiday);

      const holidayExist = await holidayRepository
        .createQueryBuilder("holiday")
        .where("(EXTRACT(YEAR FROM holiday.startDate) = :year)", {
          year: new Date(startDate).getFullYear(),
        })
        .andWhere("holiday.name = :name", { name })
        .getOne();
      if (holidayExist) {
        throw new NotAcceptableError("Holiday name already exists");
      }

      // create a new holiday
      const holiday: Holiday = holidayRepository.create({
        name,
        startDate,
        endDate,
        createdBy: session.userId,
      });
      await holidayRepository.save(holiday);

      res.locals.message = "Holiday created successfully";
      res.locals.data = {
        holiday,
      };
      next();
    } catch (error) {
      next(error);
    }
  }

  @Put("/:id")
  @Authorize([
    { permission: UserPermission.HOLIDAY_MANAGEMENT, canUpdate: true },
  ])
  public async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { name, startDate, endDate } = req.body;
      const { dataSource } = req.app.locals;

      const holidayRepository = dataSource.getRepository(Holiday);

      const holiday: Holiday | null = await holidayRepository.findOneBy({
        id,
      });

      if (!holiday) {
        throw new NotFoundError("Holiday is not found.");
      }
      if (name) {
        const holidayExist = await holidayRepository
          .createQueryBuilder("holiday")
          .where("(EXTRACT(YEAR FROM holiday.startDate) = :year)", {
            year: startDate
              ? new Date(startDate).getFullYear()
              : holiday.startDate
              ? new Date(holiday.startDate).getFullYear()
              : new Date().getFullYear(),
          })
          .andWhere("holiday.name = :name", { name })
          .getOne();
        if (holidayExist && holidayExist.id !== id) {
          throw new NotAcceptableError("Holiday name already exists");
        }
      }
      holidayRepository.merge(holiday, {
        name,
        startDate,
        endDate,
      });
      await holidayRepository.save(holiday);
      res.locals.message = "Update holiday successfully.";
      res.locals.data = {
        holiday,
      };
      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id")
  @Authorize([
    {
      permission: UserPermission.HOLIDAY_MANAGEMENT,
      canDelete: true,
    },
  ])
  public async softDelete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { dataSource } = req.app.locals;

      const holidayRepository = dataSource.getRepository(Holiday);
      const holiday = await holidayRepository.findOneBy({ id });

      if (!holiday) {
        throw new NotFoundError("Holiday is not found");
      }

      await holidayRepository.softDelete({ id });

      res.locals.message = "Holiday successfully deleted";

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id/permanently")
  @Authorize([
    {
      permission: UserPermission.HOLIDAY_MANAGEMENT,
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

      const holidayRepository = dataSource.getRepository(Holiday);
      const holiday = await holidayRepository.findOneBy({ id });

      if (!holiday) {
        throw new NotFoundError("Holiday is not found");
      }

      await holidayRepository.remove(holiday);

      res.locals.message = "Holiday successfully deleted permanently";

      next();
    } catch (error) {
      next(error);
    }
  }
  @Post("/clone")
  @Authorize([
    {
      permission: UserPermission.HOLIDAY_MANAGEMENT,
      canClone: true,
    },
  ])
  public async cloneHoliday(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { year } = req.body;
      const { dataSource } = req.app.locals;
      const { session } = res.locals;
      if (year) {
        const parsedYear = Number(year);
        if (isNaN(parsedYear)) {
          throw new BadRequestError(`Invalid year value`);
        }
      }
      const holidayRepository = dataSource.getRepository(Holiday);

      const holidayOfCurrentYear = await holidayRepository
        .createQueryBuilder("holiday")
        .where("(EXTRACT(YEAR FROM holiday.startDate) = :year)", {
          year: new Date().getFullYear(),
        })
        .getMany();

      const holidayOfSelectedYear = await holidayRepository
        .createQueryBuilder("holiday")
        .where("(EXTRACT(YEAR FROM holiday.startDate) = :year)", {
          year: Number(year),
        })
        .getMany();

      const difference = Number(year) - new Date().getFullYear();
      const cloneHolidays = holidayOfCurrentYear.map((holiday: Holiday) => {
        const newHoliday = new Holiday();
        if (holiday.startDate) {
          const startDate = new Date(holiday.startDate);
          newHoliday.startDate = new Date(
            startDate.setFullYear(startDate.getFullYear() + difference)
          );
        }
        if (holiday.endDate) {
          const endDate = new Date(holiday.endDate);
          newHoliday.endDate = new Date(
            endDate.setFullYear(endDate.getFullYear() + difference)
          );
        }
        newHoliday.name = holiday.name;
        newHoliday.createdBy = session.userId;
        return newHoliday;
      });

      await Promise.all([
        holidayRepository.remove(holidayOfSelectedYear),
        holidayRepository.save(cloneHolidays),
      ]);

      res.locals.message = "Clone Holiday successfully";
      res.locals.data = {
        holidays: cloneHolidays,
      };
      next();
    } catch (error) {
      next(error);
    }
  }
}

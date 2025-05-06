import { NextFunction, Request, Response } from "express";
import Authenticate from "../decorators/authenticate";
import Authorize from "../decorators/authorize";
import Controller from "../decorators/controller";
import { Delete, Get, Post, Put } from "../decorators/handlers";
import { UserPermission } from "../utils/permission";
import { NotAcceptableError, NotFoundError } from "../utils/errors";
import { ILike, Not } from "typeorm";
import { Market } from "../database/entities/Market";
import { Project } from "../database/entities/Project";

@Controller("/markets")
@Authenticate()
export default class MarketController {
  @Authorize([{ permission: UserPermission.MARKET_MANAGEMENT, canRead: true }])
  @Get("/")
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
        search,
        sortBy = "name",
        orderBy = "asc",
      } = req.query;

      const marketRepository = dataSource.getRepository(Market);

      const [markets, count] = await marketRepository.findAndCount({
        where: {
          name: search ? ILike(`%${search}%`) : undefined,
        },
        order: {
          [sortBy as string]: orderBy,
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
        count,
        markets,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.MARKET_MANAGEMENT, canCreate: true },
  ])
  @Post("/")
  public async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { name, description } = req.body;

      const marketRepository = dataSource.getRepository(Market);

      const marketExist: Market | null = await marketRepository.findOne({
        where: { name },
      });
      if (marketExist) {
        throw new NotAcceptableError("Market name already exists");
      }

      const market: Market = marketRepository.create({
        name,
        description,
      });
      await marketRepository.save(market);

      res.locals.message = "Market created successfully";
      res.locals.data = {
        market,
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Authorize([
    { permission: UserPermission.MARKET_MANAGEMENT, canUpdate: true },
  ])
  @Put("/:id")
  public async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { dataSource } = req.app.locals;
      const { id } = req.params;
      const { name, description } = req.body;

      const marketRepository = dataSource.getRepository(Market);

      const market: Market | null = await marketRepository.findOne({
        where: { id },
      });
      if (!market) {
        throw new NotFoundError("Market is not found");
      }

      if (name) {
        const marketExist: Market | null = await marketRepository.findOne({
          where: { id: Not(id), name },
        });
        if (marketExist) {
          throw new NotAcceptableError("Market name already exists");
        }
      }

      marketRepository.merge(market, {
        name,
        description,
      });
      await marketRepository.save(market);

      res.locals.message = "Market updated successfully";
      res.locals.data = {
        position: {
          market,
        },
      };

      next();
    } catch (error) {
      next(error);
    }
  }

  @Delete("/:id")
  @Authorize([
    {
      permission: UserPermission.MARKET_MANAGEMENT,
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

      const marketRepository = dataSource.getRepository(Market);
      const projectRepository = dataSource.getRepository(Project);

      const market: Market | null = await marketRepository.findOne({
        where: { id },
      });
      if (!market) {
        throw new NotFoundError("Market is not found.");
      }

      const projects: Project[] = await projectRepository.find({
        where: {
          market: {
            id,
          },
        },
        withDeleted: true,
      });
      if (projects.length > 0) {
        throw new NotAcceptableError(
          "Market is in use. Please delete all projects related to this market before deleting it permanently."
        );
      }

      await marketRepository.remove(market);

      res.locals.message = "Market was successfully deleted permanently.";

      next();
    } catch (error) {
      next(error);
    }
  }
}

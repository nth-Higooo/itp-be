// import { NextFunction, Request, Response } from "express";
// import Authenticate from "../decorators/authenticate";
// import Controller from "../decorators/controller";
// import { Get } from "../decorators/handlers";
// // import { handleExportUserTimeSheet } from "../utils/file";
// import { UserPermission } from "../utils/permission";
// import Authorize from "../decorators/authorize";
// import { Employee } from "../database/entities/Employee";
// import { IsNull, Not } from "typeorm";

// @Controller("/timekeepers")
// @Authenticate()
// export default class TimekeeperController {
//   @Get("/users")
//   @Authorize([
//     {
//       permission: UserPermission.TIME_SHEET_MANAGEMENT,
//       canViewTimekeeperUser: true,
//     },
//   ])
//   public async getUsers(
//     req: Request,
//     res: Response,
//     next: NextFunction
//   ): Promise<void> {
//     try {
//       const { dataSource } = req.app.locals;
//       const employeeRepository = dataSource.getRepository(Employee);
//       const response = await handleExportUserTimeSheet();

//       const employees = await employeeRepository.find({
//         where: {
//           fingerprintId: Not(IsNull()),
//         },
//       });

//       let formatData = response.map((item: any) => {
//         const isUsed = employees.find(
//           (employee: Employee) => employee.fingerprintId === item.fingerprintId
//         );
//         return {
//           ...item,
//           isUsed: isUsed ? true : false,
//         };
//       });

//       res.locals.message = "Get User Of Timekeeper successfully";
//       res.locals.data = formatData;
//       next();
//     } catch (error) {
//       next(error);
//     }
//   }
// }

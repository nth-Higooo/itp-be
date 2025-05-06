import AuthController from "../controllers/auth.controller";
import NotificationController from "../controllers/notification.controllers";
import ContractController from "../controllers/contract.controller";
import DepartmentController from "../controllers/department.controller";
import EmployeeController from "../controllers/employee.controller";
import LeaveTypeController from "../controllers/leaveType.controller";
import LeaveRequestController from "../controllers/leaveRequest.controller";
import MediaController from "../controllers/media.controller";
import OnboardingController from "../controllers/onboarding.controller";
import PositionController from "../controllers/position.controller";
import RoleController from "../controllers/role.controller";
import UserController from "../controllers/user.controller";
import HolidayController from "../controllers/holiday.controller";
import ProjectController from "../controllers/project.controller";
import SkillTypeController from "../controllers/skillType.controller";
import SkillController from "../controllers/skill.controller";
// import TimekeeperController from "../controllers/timekeeper.controller";
import EducationController from "../controllers/education.controller";
import GroupNotificationController from "../controllers/groupNotification.controller";
import MarketController from "../controllers/market.controller";
import DegreeController from "../controllers/degree.controller";

export const appRouters = [
  {
    rootPath: "/api/v1",
    controllers: [
      AuthController,
      NotificationController,
      RoleController,
      UserController,
      EmployeeController,
      ContractController,
      MediaController,
      PositionController,
      DepartmentController,
      OnboardingController,
      LeaveTypeController,
      LeaveRequestController,
      HolidayController,
      ProjectController,
      SkillTypeController,
      SkillController,
      // TimekeeperController,
      EducationController,
      GroupNotificationController,
      MarketController,
      DegreeController,
    ],
  },
];

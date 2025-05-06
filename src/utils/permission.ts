export enum UserPermission {
  // ADMINISTRATOR
  USER_MANAGEMENT = "USER_MANAGEMENT",
  ROLE_MANAGEMENT = "ROLE_MANAGEMENT",

  // EMPLOYER
  EMPLOYEE_MANAGEMENT = "EMPLOYEE_MANAGEMENT",
  CONTRACT_MANAGEMENT = "CONTRACT_MANAGEMENT",
  POSITION_MANAGEMENT = "POSITION_MANAGEMENT",
  DEPARTMENT_MANAGEMENT = "DEPARTMENT_MANAGEMENT",
  EDUCATION_MANAGEMENT = "EDUCATION_MANAGEMENT",
  DEGREE_MANAGEMENT = "DEGREE_MANAGEMENT",

  SKILL_TYPE_MANAGEMENT = "SKILL_TYPE_MANAGEMENT",
  SKILL_MANAGEMENT = "SKILL_MANAGEMENT",
  LEAVE_MANAGEMENT = "LEAVE_MANAGEMENT",
  LEAVE_TYPE_MANAGEMENT = "LEAVE_TYPE_MANAGEMENT",
  ANNUAL_LEAVE_MANAGEMENT = "ANNUAL_LEAVE_MANAGEMENT",
  HOLIDAY_MANAGEMENT = "HOLIDAY_MANAGEMENT",
  TIME_SHEET_MANAGEMENT = "TIME_SHEET_MANAGEMENT",
  GROUP_NOTIFICATION_MANAGEMENT = "GROUP_NOTIFICATION_MANAGEMENT",
  MARKET_MANAGEMENT = "MARKET_MANAGEMENT",

  // PROJECT
  PROJECT_MANAGEMENT = "PROJECT_MANAGEMENT",
}

export const SystemPermission = {
  // ADMINISTRATOR
  [UserPermission.USER_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
    {
      name: "canDelete",
      label: "Delete",
    },
    {
      name: "canPermanentlyDelete",
      label: "Permanently Delete",
    },
    {
      name: "canRestore",
      label: "Restore",
    },
  ],
  [UserPermission.ROLE_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
    {
      name: "canDelete",
      label: "Delete",
    },
    {
      name: "canSetPermission",
      label: "Set Permission",
    },
    {
      name: "canPermanentlyDelete",
      label: "Permanently Delete",
    },
    {
      name: "canRestore",
      label: "Restore",
    },
  ],

  // EMPLOYER
  [UserPermission.EMPLOYEE_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
    {
      name: "canDelete",
      label: "Delete",
    },
    {
      name: "canSubmit",
      label: "Submit",
    },
    {
      name: "canImport",
      label: "Import",
    },
    {
      name: "canExport",
      label: "Export",
    },
    {
      name: "canPermanentlyDelete",
      label: "Permanently Delete",
    },
    {
      name: "canRestore",
      label: "Restore",
    },
    {
      name: "canViewSalary",
      label: "View Salary",
    },
    {
      name: "canEditSalary",
      label: "Edit Salary",
    },
    {
      name: "canSendEmail",
      label: "Send Email",
    },
    {
      name: "canViewBenefit",
      label: "View Benefit",
    },
    {
      name: "canEditBenefit",
      label: "Edit Benefit",
    },
    {
      name: "canApprove",
      label: "Approve",
    },
  ],
  [UserPermission.CONTRACT_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
  ],

  [UserPermission.POSITION_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canDelete",
      label: "Delete",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
    {
      name: "canPermanentlyDelete",
      label: "Permanently Delete",
    },
    {
      name: "canViewSalary",
      label: "View Salary",
    },
    {
      name: "canEditSalary",
      label: "Edit Salary",
    },
  ],
  [UserPermission.DEPARTMENT_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canDelete",
      label: "Delete",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
    {
      name: "canPermanentlyDelete",
      label: "Permanently Delete",
    },
  ],
  [UserPermission.LEAVE_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canExport",
      label: "Export",
    },
    {
      name: "canApprove",
      label: "Approve",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
    {
      name: "canDelete",
      label: "Delete",
    },
    {
      name: "canPermanentlyDelete",
      label: "Permanently Delete",
    },
    {
      name: "canRestore",
      label: "Restore",
    },
  ],
  [UserPermission.LEAVE_TYPE_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canDelete",
      label: "Delete",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
  ],
  [UserPermission.ANNUAL_LEAVE_MANAGEMENT]: [
    {
      name: "canUpdate",
      label: "Update",
    },
  ],
  [UserPermission.HOLIDAY_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
    {
      name: "canDelete",
      label: "Delete",
    },
    {
      name: "canClone",
      label: "Clone",
    },
    {
      name: "canPermanentlyDelete",
      label: "Permanently Delete",
    },
  ],
  [UserPermission.TIME_SHEET_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canExport",
      label: "Export",
    },
    {
      name: "canImport",
      label: "Import",
    },
    {
      name: "canViewTimekeeperUser",
      label: "View Timekeeper User",
    },
  ],
  [UserPermission.EDUCATION_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
    {
      name: "canDelete",
      label: "Delete",
    },
  ],
  [UserPermission.GROUP_NOTIFICATION_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
    {
      name: "canDelete",
      label: "Delete",
    },
  ],
  [UserPermission.MARKET_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
    {
      name: "canDelete",
      label: "Delete",
    },
  ],

  [UserPermission.PROJECT_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
    {
      name: "canDelete",
      label: "Delete",
    },
    {
      name: "canPermanentlyDelete",
      label: "Permanently Delete",
    },
    {
      name: "canRestore",
      label: "Restore",
    },
    {
      name: "canAddMember",
      label: "Add Member",
    },
    {
      name: "canRemoveMember",
      label: "Remove Member",
    },
    {
      name: "canEditMember",
      label: "Edit Member",
    },
  ],
  [UserPermission.SKILL_TYPE_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
    {
      name: "canDelete",
      label: "Delete",
    },
  ],
  [UserPermission.SKILL_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
    {
      name: "canDelete",
      label: "Delete",
    },
  ],
  [UserPermission.DEGREE_MANAGEMENT]: [
    {
      name: "canView",
      label: "View Menu",
    },
    {
      name: "canRead",
      label: "Read",
    },
    {
      name: "canCreate",
      label: "Create",
    },
    {
      name: "canUpdate",
      label: "Update",
    },
    {
      name: "canDelete",
      label: "Delete",
    },
  ],
};

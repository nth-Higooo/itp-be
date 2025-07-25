import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1750316583171 implements MigrationInterface {
    name = 'InitSchema1750316583171'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdBy" character varying NOT NULL, "updatedBy" character varying, "deletedBy" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "name" character varying NOT NULL, "canView" boolean NOT NULL DEFAULT false, "canCreate" boolean NOT NULL DEFAULT false, "canRead" boolean NOT NULL DEFAULT false, "canUpdate" boolean NOT NULL DEFAULT false, "canDelete" boolean NOT NULL DEFAULT false, "canSetPermission" boolean NOT NULL DEFAULT false, "canImport" boolean NOT NULL DEFAULT false, "canExport" boolean NOT NULL DEFAULT false, "canSubmit" boolean NOT NULL DEFAULT false, "canCancel" boolean NOT NULL DEFAULT false, "canApprove" boolean NOT NULL DEFAULT false, "canReject" boolean NOT NULL DEFAULT false, "canReport" boolean NOT NULL DEFAULT false, "canAssign" boolean NOT NULL DEFAULT false, "canViewPartial" boolean NOT NULL DEFAULT false, "canViewBelongTo" boolean NOT NULL DEFAULT false, "canViewOwner" boolean NOT NULL DEFAULT false, "canPermanentlyDelete" boolean NOT NULL DEFAULT false, "canRestore" boolean NOT NULL DEFAULT false, "canClone" boolean NOT NULL DEFAULT false, "canViewSalary" boolean NOT NULL DEFAULT false, "canEditSalary" boolean NOT NULL DEFAULT false, "canSendEmail" boolean NOT NULL DEFAULT false, "canViewTimekeeperUser" boolean NOT NULL DEFAULT false, "canViewBenefit" boolean NOT NULL DEFAULT false, "canEditBenefit" boolean NOT NULL DEFAULT false, "canAddMember" boolean NOT NULL DEFAULT false, "canRemoveMember" boolean NOT NULL DEFAULT false, "canEditMember" boolean NOT NULL DEFAULT false, "roleId" uuid, CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_920331560282b8bd21bb02290d" ON "permissions" ("id") `);
        await queryRunner.query(`CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdBy" character varying NOT NULL, "updatedBy" character varying, "deletedBy" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "name" character varying NOT NULL, "description" character varying, CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c1433d71a4838793a49dcad46a" ON "roles" ("id") `);
        await queryRunner.query(`CREATE TABLE "positions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "level" character varying, "orderNumber" integer, "parentId" uuid, "salary" character varying, CONSTRAINT "PK_17e4e62ccd5749b289ae3fae6f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_17e4e62ccd5749b289ae3fae6f" ON "positions" ("id") `);
        await queryRunner.query(`CREATE TYPE "public"."contracts_contracttype_enum" AS ENUM('Official (1 year)', 'Official (2 years)', 'Official (3 years)', 'Official (Indefinitely)', 'Intern', 'Probation')`);
        await queryRunner.query(`CREATE TYPE "public"."contracts_workingtype_enum" AS ENUM('Fulltime', 'Parttime')`);
        await queryRunner.query(`CREATE TYPE "public"."contracts_status_enum" AS ENUM('Pending', 'Active', 'Terminated', 'Expired')`);
        await queryRunner.query(`CREATE TABLE "contracts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdBy" character varying NOT NULL, "updatedBy" character varying, "deletedBy" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "no" character varying, "contractType" "public"."contracts_contracttype_enum" NOT NULL, "workingType" "public"."contracts_workingtype_enum" NOT NULL, "startDate" date NOT NULL, "endDate" date, "status" "public"."contracts_status_enum" NOT NULL, "isRemote" boolean NOT NULL DEFAULT false, "file" character varying, "employeeId" uuid, CONSTRAINT "UQ_20938c22be8d48dadade77edaaa" UNIQUE ("no"), CONSTRAINT "PK_2c7b8f3a7b1acdd49497d83d0fb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2c7b8f3a7b1acdd49497d83d0f" ON "contracts" ("id") `);
        await queryRunner.query(`CREATE TABLE "projects_employees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isProjectManager" boolean NOT NULL DEFAULT false, "spendTime" integer NOT NULL DEFAULT '100', "projectId" uuid, "employeeId" uuid, CONSTRAINT "PK_c599e359e37200f19fbd422c7b4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_c599e359e37200f19fbd422c7b" ON "projects_employees" ("id") `);
        await queryRunner.query(`CREATE TABLE "markets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying NOT NULL, CONSTRAINT "PK_dda44129b32f21ae9f1c28dcf99" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_dda44129b32f21ae9f1c28dcf9" ON "markets" ("id") `);
        await queryRunner.query(`CREATE TYPE "public"."projects_type_enum" AS ENUM('ODC', 'PROJECT_BASED', 'TIME_MATERIAL')`);
        await queryRunner.query(`CREATE TYPE "public"."projects_status_enum" AS ENUM('INITIAL', 'PLANNING', 'EVALUATION', 'QUOTES', 'SIGN_CONTRACT', 'REJECT', 'KICK_OFF', 'IN_PROGRESS', 'ARCHIVE')`);
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdBy" character varying NOT NULL, "updatedBy" character varying, "deletedBy" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "name" character varying NOT NULL, "type" "public"."projects_type_enum" NOT NULL, "clientName" character varying NOT NULL, "business" character varying NOT NULL, "technologies" character varying NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "communicationChannels" character varying NOT NULL, "notes" character varying NOT NULL, "status" "public"."projects_status_enum" NOT NULL DEFAULT 'INITIAL', "accountManagerId" uuid, "projectManagerId" uuid, "departmentId" uuid, "marketId" uuid, CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6271df0a7aed1d6c0691ce6ac5" ON "projects" ("id") `);
        await queryRunner.query(`CREATE TYPE "public"."departments_type_enum" AS ENUM('Operation', 'Delivery')`);
        await queryRunner.query(`CREATE TABLE "departments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "orderNumber" integer NOT NULL, "parentId" uuid, "type" "public"."departments_type_enum" NOT NULL, CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_839517a681a86bb84cbcc6a1e9" ON "departments" ("id") `);
        await queryRunner.query(`CREATE TABLE "employees_departments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isManager" boolean NOT NULL DEFAULT false, "employeeId" uuid, "departmentId" uuid, CONSTRAINT "PK_0a0f4406f471939806323f916d5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0a0f4406f471939806323f916d" ON "employees_departments" ("id") `);
        await queryRunner.query(`CREATE TYPE "public"."remaining_annual_leaves_status_enum" AS ENUM('ACTIVE', 'DISABLED')`);
        await queryRunner.query(`CREATE TABLE "remaining_annual_leaves" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "quantity" double precision NOT NULL DEFAULT '0', "status" "public"."remaining_annual_leaves_status_enum" NOT NULL DEFAULT 'ACTIVE', "calculationDate" date, "year" character varying NOT NULL, "employeeId" uuid, "leaveTypeId" uuid, CONSTRAINT "PK_dc6aca461139a87f6ce5b4cd1c5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_dc6aca461139a87f6ce5b4cd1c" ON "remaining_annual_leaves" ("id") `);
        await queryRunner.query(`CREATE TABLE "leave_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdBy" character varying NOT NULL, "updatedBy" character varying, "deletedBy" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "name" character varying NOT NULL, "regulationQuantity" integer, "orderNumber" integer NOT NULL, CONSTRAINT "PK_359223e0755d19711813cd07394" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_359223e0755d19711813cd0739" ON "leave_types" ("id") `);
        await queryRunner.query(`CREATE TYPE "public"."leave_requests_status_enum" AS ENUM('Pending', 'Rejected', 'Approved')`);
        await queryRunner.query(`CREATE TYPE "public"."leave_requests_leaveperiod_enum" AS ENUM('Morning', 'Afternoon', 'Full_Day')`);
        await queryRunner.query(`CREATE TABLE "leave_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdBy" character varying NOT NULL, "updatedBy" character varying, "deletedBy" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "startDate" TIMESTAMP NOT NULL, "endDate" TIMESTAMP NOT NULL, "numberOfDays" double precision NOT NULL, "reason" character varying NOT NULL, "comment" character varying, "status" "public"."leave_requests_status_enum" NOT NULL DEFAULT 'Pending', "leavePeriod" "public"."leave_requests_leaveperiod_enum", "isInformCustomer" boolean NOT NULL DEFAULT false, "leaveTypeId" uuid, "approverId" uuid, "employeeId" uuid, CONSTRAINT "PK_d3abcf9a16cef1450129e06fa9f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d3abcf9a16cef1450129e06fa9" ON "leave_requests" ("id") `);
        await queryRunner.query(`CREATE TABLE "degrees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, CONSTRAINT "PK_0239adfff322b5db73da953035b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0239adfff322b5db73da953035" ON "degrees" ("id") `);
        await queryRunner.query(`CREATE TABLE "educations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "school" character varying, "major" character varying, "fromYear" character varying, "toYear" character varying, "certificateName" character varying, "certificateWebsite" character varying, "degreeId" uuid, "employeeId" uuid, CONSTRAINT "PK_09d2f29e7f6f31f5c01d79d2dbf" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_09d2f29e7f6f31f5c01d79d2db" ON "educations" ("id") `);
        await queryRunner.query(`CREATE TABLE "skill_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderNumber" integer NOT NULL, "name" character varying NOT NULL, "parentId" uuid, "skillName" character varying, CONSTRAINT "PK_f98a760e950fc2f7376178e0689" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f98a760e950fc2f7376178e068" ON "skill_types" ("id") `);
        await queryRunner.query(`CREATE TABLE "skill_levels" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderNumber" integer NOT NULL, "level" character varying NOT NULL, "skillTypeId" uuid, CONSTRAINT "PK_43af113b57d144742cb8b98fae8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_43af113b57d144742cb8b98fae" ON "skill_levels" ("id") `);
        await queryRunner.query(`CREATE TABLE "skills" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "isMainSkill" boolean NOT NULL DEFAULT false, "skillLevelId" uuid, "employeeId" uuid, CONSTRAINT "PK_0d3212120f4ecedf90864d7e298" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0d3212120f4ecedf90864d7e29" ON "skills" ("id") `);
        await queryRunner.query(`CREATE TYPE "public"."companies_industry_enum" AS ENUM('Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Retail', 'Energy', 'Transportation', 'Real Estate', 'Telecommunications', 'Hospitality', 'Entertainment', 'Agriculture', 'Construction', 'Legal', 'Government', 'Media', 'Consulting', 'Food and Beverage')`);
        await queryRunner.query(`CREATE TYPE "public"."companies_status_enum" AS ENUM('ACTIVE', 'INACTIVE')`);
        await queryRunner.query(`CREATE TABLE "companies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdBy" character varying NOT NULL, "updatedBy" character varying, "deletedBy" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "name" character varying NOT NULL, "email" character varying, "phone" character varying, "website" character varying, "address" character varying, "logo" character varying, "description" character varying, "foundedDate" TIMESTAMP, "numberOfEmployees" integer, "industry" "public"."companies_industry_enum", "revenue" character varying, "taxCode" character varying, "businessRegistrationCode" character varying, "businessRegistrationDate" TIMESTAMP, "businessRegistrationPlace" character varying, "legalRepresentative" character varying, "legalRepresentativePosition" character varying, "legalRepresentativeNationality" character varying, "legalRepresentativePassport" character varying, "legalRepresentativeDateOfBirth" TIMESTAMP, "legalRepresentativeAddress" character varying, "legalRepresentativePhone" character varying, "legalRepresentativeEmail" character varying, "bankAccountNumber" character varying, "bankName" character varying, "status" "public"."companies_status_enum" NOT NULL DEFAULT 'INACTIVE', CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d4bc3e82a314fa9e29f652c2c2" ON "companies" ("id") `);
        await queryRunner.query(`CREATE TYPE "public"."group_notifications_type_enum" AS ENUM('EMPLOYEE_CHANGE_REQUEST', 'CONTRACT', 'BIRTHDAY', 'OTHER')`);
        await queryRunner.query(`CREATE TABLE "group_notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdBy" character varying NOT NULL, "updatedBy" character varying, "deletedBy" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "type" "public"."group_notifications_type_enum" NOT NULL DEFAULT 'OTHER', CONSTRAINT "PK_d23a5e12f40bfd096a0baca587a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d23a5e12f40bfd096a0baca587" ON "group_notifications" ("id") `);
        await queryRunner.query(`CREATE TABLE "employee_children" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying, "dob" TIMESTAMP, "employeeId" uuid, CONSTRAINT "PK_9b11d6d1209d70da0760657867e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9b11d6d1209d70da0760657867" ON "employee_children" ("id") `);
        await queryRunner.query(`CREATE TYPE "public"."employees_gender_enum" AS ENUM('Male', 'Female', 'Other')`);
        await queryRunner.query(`CREATE TYPE "public"."employees_maritalstatus_enum" AS ENUM('Single', 'Marriage', 'Divorce', 'Widow')`);
        await queryRunner.query(`CREATE TABLE "employees" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdBy" character varying NOT NULL, "updatedBy" character varying, "deletedBy" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "photo" character varying NOT NULL, "fullName" character varying NOT NULL, "employeeCode" character varying, "personalEmail" character varying, "dateOfBirth" TIMESTAMP, "placeOfBirth" character varying, "gender" "public"."employees_gender_enum", "maritalStatus" "public"."employees_maritalstatus_enum" DEFAULT 'Single', "contactAddress" character varying, "permanentAddress" character varying, "phoneNumber" character varying, "homeTown" character varying, "changedInformation" jsonb, "recommendedRoleIds" character varying, "personalCV" character varying, "companyCV" character varying, "monthlyRate" character varying, "hourlyRate" character varying, "vneIDNo" character varying, "vneIDDate" TIMESTAMP, "vneIDPlace" character varying, "vneIDCardFront" character varying, "vneIDCardBack" character varying, "pitNo" character varying, "siNo" character varying, "ecRelationship" character varying, "ecName" character varying, "ecPhoneNumber" character varying, "bankName" character varying, "bankBranch" character varying, "bankAccountName" character varying, "bankAccountNumber" character varying, "fingerprintId" character varying, "payslipPassword" character varying, "joinDate" date, "leaveDate" date, "resignDate" date, "resignReason" character varying, "basicSalary" character varying, "responsibilityAllowance" character varying, "petrolAllowance" character varying, "phoneAllowance" character varying, "lunchAllowance" character varying, "parkingAllowance" character varying, "seniorityBonus" character varying, "performanceBonus" character varying, "overtimeIncome" character varying, "otherBonus" character varying, "otherIncome" character varying, "socialInsurance" character varying, "personalIncomeTax" character varying, "othersDeduction" character varying, "netAmount" character varying, "siPayment" character varying, "healthCare" character varying, "healthCheck" character varying, "teamFund" character varying, "parkingFee" character varying, "birthdayGift" character varying, "midAutumnGift" character varying, "tetGift" character varying, "YEP" character varying, "companyTrip" character varying, "notes" character varying, "userId" uuid, "positionId" uuid, "companyId" uuid, CONSTRAINT "UQ_e3d0372d1ebe64cf827743666ce" UNIQUE ("employeeCode"), CONSTRAINT "PK_b9535a98350d5b26e7eb0c26af4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b9535a98350d5b26e7eb0c26af" ON "employees" ("id") `);
        await queryRunner.query(`CREATE TYPE "public"."notifications_contenttype_enum" AS ENUM('order', 'chat', 'mail', 'delivery')`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdBy" character varying NOT NULL, "updatedBy" character varying, "deletedBy" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "content" character varying NOT NULL, "contentType" "public"."notifications_contenttype_enum" NOT NULL DEFAULT 'mail', "category" character varying, "isRead" boolean NOT NULL DEFAULT false, "actions" jsonb, "assigneeId" uuid, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6a72c3c0f683f6462415e653c3" ON "notifications" ("id") `);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('PENDING', 'ACTIVE', 'DISABLED')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdBy" character varying NOT NULL, "updatedBy" character varying, "deletedBy" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "displayName" character varying NOT NULL, "avatar" character varying, "email" character varying NOT NULL, "hashPassword" character varying NOT NULL, "status" "public"."users_status_enum" NOT NULL DEFAULT 'PENDING', "resetToken" character varying, "activeToken" character varying, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a3ffb1c0c8416b9fc6f907b743" ON "users" ("id") `);
        await queryRunner.query(`CREATE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "employeeId" character varying, "departments" jsonb, "projects" jsonb, "email" character varying NOT NULL, "accessToken" character varying NOT NULL, "refreshToken" character varying NOT NULL, "userAgent" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" uuid, CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3238ef96f18b355b671619111b" ON "sessions" ("id") `);
        await queryRunner.query(`CREATE INDEX "IDX_c6d6176d411b0b3c854df5d4d0" ON "sessions" ("accessToken") `);
        await queryRunner.query(`CREATE INDEX "IDX_b443618a8149644123d48eceed" ON "sessions" ("refreshToken") `);
        await queryRunner.query(`CREATE TABLE "holidays" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdBy" character varying NOT NULL, "updatedBy" character varying, "deletedBy" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "name" character varying NOT NULL, "startDate" TIMESTAMP, "endDate" TIMESTAMP, CONSTRAINT "PK_3646bdd4c3817d954d830881dfe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3646bdd4c3817d954d830881df" ON "holidays" ("id") `);
        await queryRunner.query(`CREATE TABLE "employees_group_notifications" ("employeeId" uuid NOT NULL, "groupId" uuid NOT NULL, CONSTRAINT "PK_4598fcb9842bd2d17c7e5885a04" PRIMARY KEY ("employeeId", "groupId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_251ba44dfc8414cc2199c64e51" ON "employees_group_notifications" ("employeeId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e81fab67954e82df3120221268" ON "employees_group_notifications" ("groupId") `);
        await queryRunner.query(`CREATE TABLE "users_roles" ("userId" uuid NOT NULL, "roleId" uuid NOT NULL, CONSTRAINT "PK_a472bd14ea5d26f611025418d57" PRIMARY KEY ("userId", "roleId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_776b7cf9330802e5ef5a8fb18d" ON "users_roles" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4fb14631257670efa14b15a3d8" ON "users_roles" ("roleId") `);
        await queryRunner.query(`ALTER TABLE "permissions" ADD CONSTRAINT "FK_36d7b8e1a331102ec9161e879ce" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "contracts" ADD CONSTRAINT "FK_3681f79a2d6a77debddbfaad4e9" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "projects_employees" ADD CONSTRAINT "FK_6329e71c13238670a58a336bc2f" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "projects_employees" ADD CONSTRAINT "FK_a052578473195dd46a712ec8315" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_20c89b4ec9a5874410b9c7475e8" FOREIGN KEY ("accountManagerId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_1fa4a36bc7ea7727a1ff25be92f" FOREIGN KEY ("projectManagerId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_a63577f1af41220752b20fb58c6" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_33b2201d1be8813a2feabd095d1" FOREIGN KEY ("marketId") REFERENCES "markets"("id") ON DELETE NO ACTION ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "employees_departments" ADD CONSTRAINT "FK_708536ca503fe9fee923e9ffd48" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employees_departments" ADD CONSTRAINT "FK_dc189f68e1a143b22992f61ed4d" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "remaining_annual_leaves" ADD CONSTRAINT "FK_bfa4a3f1c2188a9213e8d812a09" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "remaining_annual_leaves" ADD CONSTRAINT "FK_c75d65fcb60bd97d364c4655b13" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_1a15bd6c14a42bb91c53712a5f4" FOREIGN KEY ("leaveTypeId") REFERENCES "leave_types"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_7e54f09b0d6fa86524cab451a49" FOREIGN KEY ("approverId") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "leave_requests" ADD CONSTRAINT "FK_4eda1468756ca831495e308e407" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "educations" ADD CONSTRAINT "FK_147e26bc4f177bb91a687e85c1d" FOREIGN KEY ("degreeId") REFERENCES "degrees"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "educations" ADD CONSTRAINT "FK_72be0f881f41552fcd42578d4bd" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "skill_levels" ADD CONSTRAINT "FK_ddbc1cafb63d18f335a0776cba3" FOREIGN KEY ("skillTypeId") REFERENCES "skill_types"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "skills" ADD CONSTRAINT "FK_6d68e65053b5f4416332b3f6a96" FOREIGN KEY ("skillLevelId") REFERENCES "skill_levels"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "skills" ADD CONSTRAINT "FK_3e63260109cfd258cabedb17e63" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employee_children" ADD CONSTRAINT "FK_b80c9b1dc561cb8282eceb30a88" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_737991e10350d9626f592894cef" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_ce0210d6441acd0e094fba8f20a" FOREIGN KEY ("positionId") REFERENCES "positions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employees" ADD CONSTRAINT "FK_c7b030a4514a003d9d8d31a812b" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_e8a2c0f61c41002d279487a733e" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "employees_group_notifications" ADD CONSTRAINT "FK_251ba44dfc8414cc2199c64e517" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "employees_group_notifications" ADD CONSTRAINT "FK_e81fab67954e82df31202212681" FOREIGN KEY ("groupId") REFERENCES "group_notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "users_roles" ADD CONSTRAINT "FK_776b7cf9330802e5ef5a8fb18dc" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "users_roles" ADD CONSTRAINT "FK_4fb14631257670efa14b15a3d86" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users_roles" DROP CONSTRAINT "FK_4fb14631257670efa14b15a3d86"`);
        await queryRunner.query(`ALTER TABLE "users_roles" DROP CONSTRAINT "FK_776b7cf9330802e5ef5a8fb18dc"`);
        await queryRunner.query(`ALTER TABLE "employees_group_notifications" DROP CONSTRAINT "FK_e81fab67954e82df31202212681"`);
        await queryRunner.query(`ALTER TABLE "employees_group_notifications" DROP CONSTRAINT "FK_251ba44dfc8414cc2199c64e517"`);
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_e8a2c0f61c41002d279487a733e"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_c7b030a4514a003d9d8d31a812b"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_ce0210d6441acd0e094fba8f20a"`);
        await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "FK_737991e10350d9626f592894cef"`);
        await queryRunner.query(`ALTER TABLE "employee_children" DROP CONSTRAINT "FK_b80c9b1dc561cb8282eceb30a88"`);
        await queryRunner.query(`ALTER TABLE "skills" DROP CONSTRAINT "FK_3e63260109cfd258cabedb17e63"`);
        await queryRunner.query(`ALTER TABLE "skills" DROP CONSTRAINT "FK_6d68e65053b5f4416332b3f6a96"`);
        await queryRunner.query(`ALTER TABLE "skill_levels" DROP CONSTRAINT "FK_ddbc1cafb63d18f335a0776cba3"`);
        await queryRunner.query(`ALTER TABLE "educations" DROP CONSTRAINT "FK_72be0f881f41552fcd42578d4bd"`);
        await queryRunner.query(`ALTER TABLE "educations" DROP CONSTRAINT "FK_147e26bc4f177bb91a687e85c1d"`);
        await queryRunner.query(`ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_4eda1468756ca831495e308e407"`);
        await queryRunner.query(`ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_7e54f09b0d6fa86524cab451a49"`);
        await queryRunner.query(`ALTER TABLE "leave_requests" DROP CONSTRAINT "FK_1a15bd6c14a42bb91c53712a5f4"`);
        await queryRunner.query(`ALTER TABLE "remaining_annual_leaves" DROP CONSTRAINT "FK_c75d65fcb60bd97d364c4655b13"`);
        await queryRunner.query(`ALTER TABLE "remaining_annual_leaves" DROP CONSTRAINT "FK_bfa4a3f1c2188a9213e8d812a09"`);
        await queryRunner.query(`ALTER TABLE "employees_departments" DROP CONSTRAINT "FK_dc189f68e1a143b22992f61ed4d"`);
        await queryRunner.query(`ALTER TABLE "employees_departments" DROP CONSTRAINT "FK_708536ca503fe9fee923e9ffd48"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_33b2201d1be8813a2feabd095d1"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_a63577f1af41220752b20fb58c6"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_1fa4a36bc7ea7727a1ff25be92f"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_20c89b4ec9a5874410b9c7475e8"`);
        await queryRunner.query(`ALTER TABLE "projects_employees" DROP CONSTRAINT "FK_a052578473195dd46a712ec8315"`);
        await queryRunner.query(`ALTER TABLE "projects_employees" DROP CONSTRAINT "FK_6329e71c13238670a58a336bc2f"`);
        await queryRunner.query(`ALTER TABLE "contracts" DROP CONSTRAINT "FK_3681f79a2d6a77debddbfaad4e9"`);
        await queryRunner.query(`ALTER TABLE "permissions" DROP CONSTRAINT "FK_36d7b8e1a331102ec9161e879ce"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4fb14631257670efa14b15a3d8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_776b7cf9330802e5ef5a8fb18d"`);
        await queryRunner.query(`DROP TABLE "users_roles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e81fab67954e82df3120221268"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_251ba44dfc8414cc2199c64e51"`);
        await queryRunner.query(`DROP TABLE "employees_group_notifications"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3646bdd4c3817d954d830881df"`);
        await queryRunner.query(`DROP TABLE "holidays"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b443618a8149644123d48eceed"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c6d6176d411b0b3c854df5d4d0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3238ef96f18b355b671619111b"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a3ffb1c0c8416b9fc6f907b743"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6a72c3c0f683f6462415e653c3"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TYPE "public"."notifications_contenttype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b9535a98350d5b26e7eb0c26af"`);
        await queryRunner.query(`DROP TABLE "employees"`);
        await queryRunner.query(`DROP TYPE "public"."employees_maritalstatus_enum"`);
        await queryRunner.query(`DROP TYPE "public"."employees_gender_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9b11d6d1209d70da0760657867"`);
        await queryRunner.query(`DROP TABLE "employee_children"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d23a5e12f40bfd096a0baca587"`);
        await queryRunner.query(`DROP TABLE "group_notifications"`);
        await queryRunner.query(`DROP TYPE "public"."group_notifications_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d4bc3e82a314fa9e29f652c2c2"`);
        await queryRunner.query(`DROP TABLE "companies"`);
        await queryRunner.query(`DROP TYPE "public"."companies_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."companies_industry_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0d3212120f4ecedf90864d7e29"`);
        await queryRunner.query(`DROP TABLE "skills"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_43af113b57d144742cb8b98fae"`);
        await queryRunner.query(`DROP TABLE "skill_levels"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f98a760e950fc2f7376178e068"`);
        await queryRunner.query(`DROP TABLE "skill_types"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_09d2f29e7f6f31f5c01d79d2db"`);
        await queryRunner.query(`DROP TABLE "educations"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0239adfff322b5db73da953035"`);
        await queryRunner.query(`DROP TABLE "degrees"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d3abcf9a16cef1450129e06fa9"`);
        await queryRunner.query(`DROP TABLE "leave_requests"`);
        await queryRunner.query(`DROP TYPE "public"."leave_requests_leaveperiod_enum"`);
        await queryRunner.query(`DROP TYPE "public"."leave_requests_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_359223e0755d19711813cd0739"`);
        await queryRunner.query(`DROP TABLE "leave_types"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dc6aca461139a87f6ce5b4cd1c"`);
        await queryRunner.query(`DROP TABLE "remaining_annual_leaves"`);
        await queryRunner.query(`DROP TYPE "public"."remaining_annual_leaves_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0a0f4406f471939806323f916d"`);
        await queryRunner.query(`DROP TABLE "employees_departments"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_839517a681a86bb84cbcc6a1e9"`);
        await queryRunner.query(`DROP TABLE "departments"`);
        await queryRunner.query(`DROP TYPE "public"."departments_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6271df0a7aed1d6c0691ce6ac5"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP TYPE "public"."projects_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."projects_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dda44129b32f21ae9f1c28dcf9"`);
        await queryRunner.query(`DROP TABLE "markets"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c599e359e37200f19fbd422c7b"`);
        await queryRunner.query(`DROP TABLE "projects_employees"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2c7b8f3a7b1acdd49497d83d0f"`);
        await queryRunner.query(`DROP TABLE "contracts"`);
        await queryRunner.query(`DROP TYPE "public"."contracts_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."contracts_workingtype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."contracts_contracttype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_17e4e62ccd5749b289ae3fae6f"`);
        await queryRunner.query(`DROP TABLE "positions"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_c1433d71a4838793a49dcad46a"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_920331560282b8bd21bb02290d"`);
        await queryRunner.query(`DROP TABLE "permissions"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class GrandPermission1722323212493 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO permissions ("roleId", name, "canView", "canCreate", "canRead", "canUpdate", "canDelete", "canPermanentlyDelete", "canRestore", "canSetPermission", "createdBy")
            SELECT roles.id, 'ROLE_MANAGEMENT', true, true, true, true, true, true, true, true, 'migration'
            FROM roles LIMIT 1;`
    );
    await queryRunner.query(
      `INSERT INTO permissions ("roleId", name, "canView", "canCreate", "canRead", "canUpdate", "canDelete", "canPermanentlyDelete", "canRestore", "createdBy")
            SELECT roles.id, 'USER_MANAGEMENT', true, true, true, true, true, true, true, 'migration'
            FROM roles LIMIT 1;`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`TRUNCATE TABLE permissions;`);
  }
}

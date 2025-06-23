import { MigrationInterface, QueryRunner } from "typeorm";

export class InitLeaveType1728642280136 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO leave_types ("name", "regulationQuantity", "orderNumber", "createdBy")
            SELECT 'Annual leave', '12', '0', 'migration'
            WHERE NOT EXISTS (
                SELECT 1
                FROM leave_types
                WHERE name = 'Annual leave'
            );`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM leave_types WHERE name='Annual leave';`
    );
  }
}

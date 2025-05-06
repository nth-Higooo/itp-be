import { MigrationInterface, QueryRunner } from "typeorm";

export class InitRoleEmployee1723516722735 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO roles (name, "createdBy")
                      SELECT 'Employee', 'migration'
                      WHERE NOT EXISTS (
                          SELECT 1
                          FROM roles
                          WHERE name = 'Employee'
                      );`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM roles WHERE name = 'Employee';`);
  }
}

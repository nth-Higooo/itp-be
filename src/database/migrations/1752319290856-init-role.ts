import { MigrationInterface, QueryRunner } from "typeorm";

export class InitRole1722319290856 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO roles (name, "createdBy")
                SELECT 'Administrator', 'migration'
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM roles
                    WHERE name = 'Administrator'
                );`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM roles WHERE name = 'Administrator';`);
  }
}

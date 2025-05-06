import { MigrationInterface, QueryRunner } from "typeorm";

export class GrandRole1722321599764 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO users_roles ("userId", "roleId")
        SELECT u.id as "userId", r.id as "roleId" FROM users u FULL JOIN roles r ON true`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`TRUNCATE TABLE users_roles;`);
  }
}

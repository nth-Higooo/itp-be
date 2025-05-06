import { MigrationInterface, QueryRunner } from "typeorm";
import { getHashPassword } from "../../utils";

export class InitData1722307378376 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO users ("displayName", email, "hashPassword", status, "createdBy")
            SELECT 'Hien Nguyen', 'nth.hiennguyenthanh@gmail.com', '${getHashPassword(
              "12345678@"
            )}', 'ACTIVE', 'migration'
            WHERE NOT EXISTS (
                SELECT 1
                FROM users
                WHERE email = 'nth.hiennguyenthanh@gmail.com'
            );`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM users WHERE email='nth.hiennguyenthanh@gmail.com';
      DELETE FROM sessions WHERE email='nth.hiennguyenthanh@gmail.com';`
    );
  }
}

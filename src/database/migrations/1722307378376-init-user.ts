import { MigrationInterface, QueryRunner } from "typeorm";
import { getHashPassword } from "../../utils";

export class InitData1722307378376 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO users ("displayName", email, "hashPassword", status, "createdBy")
            SELECT 'Man Tran', 'man.tran@watasoftware.com', '${getHashPassword(
              "123456@Wts"
            )}', 'ACTIVE', 'migration'
            WHERE NOT EXISTS (
                SELECT 1
                FROM users
                WHERE email = 'man.tran@watasoftware.com'
            );`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM users WHERE email='man.tran@watasoftware.com';
      DELETE FROM sessions WHERE email='man.tran@watasoftware.com';`
    );
  }
}

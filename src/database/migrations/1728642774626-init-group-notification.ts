import { MigrationInterface, QueryRunner } from "typeorm";

export class InitGroupNotification1728642774626 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO group_notifications ("type", "createdBy")
            SELECT 'BIRTHDAY', 'migration'
            WHERE NOT EXISTS (
                SELECT 1
                FROM group_notifications
                WHERE type = 'BIRTHDAY'
            );

        INSERT INTO group_notifications ("type", "createdBy")
            SELECT 'CONTRACT', 'migration'
            WHERE NOT EXISTS (
                SELECT 1
                FROM group_notifications
                WHERE type = 'CONTRACT'
            );`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM group_notifications WHERE type='CONTRACT';
        DELETE FROM group_notifications WHERE type='BIRTHDAY';`
    );
  }
}

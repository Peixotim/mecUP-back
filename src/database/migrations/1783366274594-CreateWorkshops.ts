import type { MigrationInterface, QueryRunner } from 'typeorm'

export class CreateWorkshops1783366274594 implements MigrationInterface {
  name = 'CreateWorkshops1783366274594'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`)
    await queryRunner.query(
      `CREATE TABLE "workshops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "name" character varying NOT NULL, "cnpj" character varying, "phone" character varying, "address" character varying, "logo_url" character varying, "settings" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "UQ_edecef71170e063402866d658c0" UNIQUE ("cnpj"), CONSTRAINT "PK_6d0e82a124f5b53df91c8989848" PRIMARY KEY ("id"))`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "workshops"`)
  }
}

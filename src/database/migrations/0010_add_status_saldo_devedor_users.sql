ALTER TABLE "users" ADD COLUMN "status" text DEFAULT 'ativo' NOT NULL;
ALTER TABLE "users" ADD COLUMN "saldo_devedor" numeric(10, 2) DEFAULT '0' NOT NULL;

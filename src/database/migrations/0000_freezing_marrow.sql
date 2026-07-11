CREATE TYPE "public"."document_status" AS ENUM('aprovado', 'pendente', 'rejeitado');--> statement-breakpoint
CREATE TYPE "public"."document_tipo" AS ENUM('cnh', 'crlv', 'foto_veiculo');--> statement-breakpoint
CREATE TYPE "public"."driver_status" AS ENUM('ativo', 'inativo', 'pendente', 'rejeitado');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "drivers" (
	"id" text PRIMARY KEY NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"telefone" text NOT NULL,
	"cnh" text NOT NULL,
	"status" "driver_status" DEFAULT 'pendente' NOT NULL,
	"avatar_url" text,
	"veiculo_placa" text NOT NULL,
	"veiculo_modelo" text NOT NULL,
	"veiculo_ano" integer NOT NULL,
	"localizacao_lat" numeric(10, 7),
	"localizacao_lng" numeric(10, 7),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "drivers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "driver_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"driver_id" text NOT NULL,
	"tipo" "document_tipo" NOT NULL,
	"status" "document_status" DEFAULT 'pendente' NOT NULL,
	"enviado_em" timestamp DEFAULT now() NOT NULL,
	"arquivo_url" text,
	"revisado_por" text,
	"motivo_rejeicao" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rides" (
	"id" text PRIMARY KEY NOT NULL,
	"driver_id" text NOT NULL,
	"data" timestamp DEFAULT now() NOT NULL,
	"origem" text NOT NULL,
	"destino" text NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"avaliacao" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rides" ADD CONSTRAINT "rides_driver_id_drivers_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."drivers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

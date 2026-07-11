ALTER TABLE "drivers" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "endereco_cep" text NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "endereco_logradouro" text NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "endereco_numero" text NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "endereco_complemento" text;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "endereco_bairro" text NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "endereco_cidade" text NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "endereco_uf" text NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_unique" UNIQUE("user_id");
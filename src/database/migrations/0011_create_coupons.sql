CREATE TYPE "public"."coupon_tipo_desconto" AS ENUM('percentual', 'fixo');--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"tipo_desconto" "coupon_tipo_desconto" NOT NULL,
	"valor" numeric(10, 2) NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_codigo_unique" UNIQUE("codigo")
);

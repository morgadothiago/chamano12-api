CREATE TABLE "pricing_config" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"taxa_base" numeric(10,2) DEFAULT '5.00' NOT NULL,
	"valor_por_km" numeric(10,2) DEFAULT '2.50' NOT NULL,
	"valor_por_minuto" numeric(10,2) DEFAULT '0.50' NOT NULL,
	"valor_minimo" numeric(10,2) DEFAULT '10.00' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TYPE "public"."ride_forma_pagamento" AS ENUM('dinheiro', 'cartao', 'pix');--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "forma_pagamento" "ride_forma_pagamento";

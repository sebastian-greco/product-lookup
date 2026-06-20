CREATE TYPE "public"."product_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar(30) PRIMARY KEY NOT NULL,
	"sku" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(128) NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" "product_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_id_format_check" CHECK ("products"."id" ~ '^prd_[0-9A-HJKMNP-TV-Z]{26}$'),
	CONSTRAINT "products_sku_not_blank_check" CHECK (btrim("products"."sku") <> ''),
	CONSTRAINT "products_name_not_blank_check" CHECK (btrim("products"."name") <> ''),
	CONSTRAINT "products_category_not_blank_check" CHECK (btrim("products"."category") <> ''),
	CONSTRAINT "products_price_positive_check" CHECK ("products"."price" > 0),
	CONSTRAINT "products_currency_format_check" CHECK ("products"."currency" ~ '^[A-Z]{3}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "products_sku_unique_idx" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "products" USING btree ("category");--> statement-breakpoint
CREATE INDEX "products_status_idx" ON "products" USING btree ("status");

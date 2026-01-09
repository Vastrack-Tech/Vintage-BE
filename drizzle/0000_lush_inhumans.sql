CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('customer', 'admin');--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"password" text,
	"phone" text,
	"address" text,
	"role" "role" DEFAULT 'customer' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"slug" text,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"category_id" varchar(20),
	"title" text NOT NULL,
	"description" text NOT NULL,
	"base_price" numeric(10, 2) NOT NULL,
	"compare_at_price" numeric(10, 2),
	"gallery" jsonb DEFAULT '[]'::jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_hot" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"avg_rating" numeric(3, 2) DEFAULT '0',
	"total_reviews" integer DEFAULT 0,
	"features" text,
	"shipping_policy" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"product_id" varchar(20) NOT NULL,
	"name" text NOT NULL,
	"attributes" jsonb NOT NULL,
	"price_override" numeric(10, 2),
	"stock_quantity" integer DEFAULT 0,
	"sku" text,
	CONSTRAINT "variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"order_id" varchar(20) NOT NULL,
	"variant_id" varchar(20) NOT NULL,
	"quantity" integer DEFAULT 1,
	"price_at_purchase" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"status" "order_status" DEFAULT 'pending',
	"payment_reference" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"user_id" varchar(20),
	"product_id" varchar(20),
	"rating" integer NOT NULL,
	"content" text,
	"customer_photo_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"user_id" varchar(20) NOT NULL,
	"order_id" varchar(20),
	"reference" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'NGN',
	"status" text DEFAULT 'pending',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "payments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" varchar(20) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"page" text NOT NULL,
	"section" text NOT NULL,
	"url" text NOT NULL,
	"click_url" text,
	"position" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;
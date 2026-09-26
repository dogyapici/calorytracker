CREATE TYPE "public"."food_source" AS ENUM('off', 'custom');--> statement-breakpoint
CREATE TYPE "public"."goal" AS ENUM('lose', 'maintain', 'gain');--> statement-breakpoint
CREATE TYPE "public"."meal" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('male', 'female');--> statement-breakpoint
CREATE TABLE "entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"day" date NOT NULL,
	"meal" "meal" NOT NULL,
	"food_id" integer,
	"name" text NOT NULL,
	"grams" real NOT NULL,
	"kcal" real NOT NULL,
	"protein" real NOT NULL,
	"carbs" real NOT NULL,
	"fat" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"user_id" integer NOT NULL,
	"food_id" integer NOT NULL,
	CONSTRAINT "favorites_user_id_food_id_pk" PRIMARY KEY("user_id","food_id")
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" "food_source" NOT NULL,
	"barcode" text,
	"owner_id" integer,
	"name" text NOT NULL,
	"brand" text,
	"kcal" real NOT NULL,
	"protein" real DEFAULT 0 NOT NULL,
	"carbs" real DEFAULT 0 NOT NULL,
	"sugar" real,
	"fat" real DEFAULT 0 NOT NULL,
	"saturated_fat" real,
	"fiber" real,
	"salt" real,
	"serving_grams" real,
	"serving_label" text,
	"image_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"sex" "sex",
	"birth_year" integer,
	"height_cm" real,
	"activity_factor" real DEFAULT 1.375 NOT NULL,
	"goal" "goal" DEFAULT 'maintain' NOT NULL,
	"kcal_target" integer DEFAULT 2000 NOT NULL,
	"protein_target" integer DEFAULT 100 NOT NULL,
	"carbs_target" integer DEFAULT 250 NOT NULL,
	"fat_target" integer DEFAULT 67 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "weights" (
	"user_id" integer NOT NULL,
	"day" date NOT NULL,
	"kg" real NOT NULL,
	CONSTRAINT "weights_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weights" ADD CONSTRAINT "weights_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_user_day_idx" ON "entries" USING btree ("user_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "foods_barcode_idx" ON "foods" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "foods_owner_idx" ON "foods" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");
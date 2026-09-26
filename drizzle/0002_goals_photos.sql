CREATE TYPE "public"."macro_mode" AS ENUM('percent', 'grams');--> statement-breakpoint
CREATE TABLE "weight_photos" (
	"user_id" integer NOT NULL,
	"day" date NOT NULL,
	"mime_type" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weight_photos_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "macro_mode" "macro_mode" DEFAULT 'grams' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "protein_pct" real;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "carbs_pct" real;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "fat_pct" real;--> statement-breakpoint
ALTER TABLE "weights" ADD COLUMN "waist_cm" real;--> statement-breakpoint
ALTER TABLE "weights" ADD COLUMN "hip_cm" real;--> statement-breakpoint
ALTER TABLE "weights" ADD COLUMN "chest_cm" real;--> statement-breakpoint
ALTER TABLE "weights" ADD COLUMN "arm_cm" real;--> statement-breakpoint
ALTER TABLE "weights" ADD COLUMN "thigh_cm" real;--> statement-breakpoint
ALTER TABLE "weights" ADD COLUMN "body_fat_pct" real;--> statement-breakpoint
ALTER TABLE "weight_photos" ADD CONSTRAINT "weight_photos_user_id_day_weights_user_id_day_fk" FOREIGN KEY ("user_id","day") REFERENCES "public"."weights"("user_id","day") ON DELETE cascade ON UPDATE no action;
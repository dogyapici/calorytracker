CREATE TABLE "water" (
	"user_id" integer NOT NULL,
	"day" date NOT NULL,
	"ml" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "water_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "meal_split" jsonb;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "water_target_ml" integer DEFAULT 2000 NOT NULL;--> statement-breakpoint
ALTER TABLE "water" ADD CONSTRAINT "water_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
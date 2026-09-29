CREATE TABLE "workout_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_logs" (
	"user_id" integer NOT NULL,
	"exercise_id" integer NOT NULL,
	"week" date NOT NULL,
	"weight_kg" real NOT NULL,
	"reps" integer NOT NULL,
	"sets" integer,
	"note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workout_logs_exercise_id_week_pk" PRIMARY KEY("exercise_id","week")
);
--> statement-breakpoint
ALTER TABLE "workout_categories" ADD CONSTRAINT "workout_categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_category_id_workout_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."workout_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_logs" ADD CONSTRAINT "workout_logs_exercise_id_workout_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."workout_exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workout_categories_user_idx" ON "workout_categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workout_exercises_category_idx" ON "workout_exercises" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "workout_logs_user_idx" ON "workout_logs" USING btree ("user_id");
ALTER TYPE "public"."food_source" ADD VALUE 'recipe';--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"food_id" integer NOT NULL,
	"grams" real NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_meal_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"saved_meal_id" integer NOT NULL,
	"food_id" integer NOT NULL,
	"grams" real NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_meals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "sugar" real;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "saturated_fat" real;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "fiber" real;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "salt" real;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "micros" jsonb;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "micros" jsonb;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "recipe_servings" integer;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "recipe_cooked_grams" real;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_foods_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_meal_items" ADD CONSTRAINT "saved_meal_items_saved_meal_id_saved_meals_id_fk" FOREIGN KEY ("saved_meal_id") REFERENCES "public"."saved_meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_meal_items" ADD CONSTRAINT "saved_meal_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_meals" ADD CONSTRAINT "saved_meals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recipe_ingredients_recipe_idx" ON "recipe_ingredients" USING btree ("recipe_id");--> statement-breakpoint
CREATE INDEX "saved_meal_items_meal_idx" ON "saved_meal_items" USING btree ("saved_meal_id");--> statement-breakpoint
CREATE INDEX "saved_meals_user_idx" ON "saved_meals" USING btree ("user_id");
import {
  customType,
  date,
  foreignKey,
  jsonb,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { Micros } from "../lib/micros";

export type MealSplit = Record<"breakfast" | "lunch" | "dinner" | "snack", number>;

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const sexEnum = pgEnum("sex", ["male", "female"]);
export const goalEnum = pgEnum("goal", ["lose", "maintain", "gain"]);
export const mealEnum = pgEnum("meal", ["breakfast", "lunch", "dinner", "snack"]);
export const macroModeEnum = pgEnum("macro_mode", ["percent", "grams"]);
export const foodSourceEnum = pgEnum("food_source", ["off", "custom", "recipe"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the cookie token, so a leaked database does not leak live sessions.
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const profiles = pgTable("profiles", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  sex: sexEnum("sex"),
  birthYear: integer("birth_year"),
  heightCm: real("height_cm"),
  // Multiplier on BMR, e.g. 1.2 (sedentary) to 1.9 (very active).
  activityFactor: real("activity_factor").notNull().default(1.375),
  goal: goalEnum("goal").notNull().default("maintain"),
  kcalTarget: integer("kcal_target").notNull().default(2000),
  proteinTarget: integer("protein_target").notNull().default(100),
  carbsTarget: integer("carbs_target").notNull().default(250),
  fatTarget: integer("fat_target").notNull().default(67),
  // Whether the user edits macro targets as shares of calories or as grams. Gram targets above
  // are always stored and always consistent with kcalTarget; the shares are kept for editing.
  macroMode: macroModeEnum("macro_mode").notNull().default("grams"),
  proteinPct: real("protein_pct"),
  carbsPct: real("carbs_pct"),
  fatPct: real("fat_pct"),
  // Optional share of the calorie target per meal in percent, summing to 100; null = no meal targets.
  mealSplit: jsonb("meal_split").$type<MealSplit>(),
  waterTargetMl: integer("water_target_ml").notNull().default(2000),
});

export const foods = pgTable(
  "foods",
  {
    id: serial("id").primaryKey(),
    source: foodSourceEnum("source").notNull(),
    // Open Food Facts barcode; null for custom foods.
    barcode: text("barcode"),
    // Owner of a custom food; null for shared Open Food Facts imports.
    ownerId: integer("owner_id").references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    brand: text("brand"),
    kcal: real("kcal").notNull(),
    protein: real("protein").notNull().default(0),
    carbs: real("carbs").notNull().default(0),
    sugar: real("sugar"),
    fat: real("fat").notNull().default(0),
    saturatedFat: real("saturated_fat"),
    fiber: real("fiber"),
    salt: real("salt"),
    servingGrams: real("serving_grams"),
    servingLabel: text("serving_label"),
    imageUrl: text("image_url"),
    // Vitamins and minerals per 100 g, see src/lib/micros.ts for keys and units.
    micros: jsonb("micros").$type<Micros>(),
    // Recipes only: how many portions the recipe makes, and the weight after cooking if the cook weighed it.
    recipeServings: integer("recipe_servings"),
    recipeCookedGrams: real("recipe_cooked_grams"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("foods_barcode_idx").on(t.barcode), index("foods_owner_idx").on(t.ownerId)],
);

export const entries = pgTable(
  "entries",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    meal: mealEnum("meal").notNull(),
    foodId: integer("food_id").references(() => foods.id, { onDelete: "set null" }),
    // Snapshot of the food at logging time so later edits do not rewrite history.
    name: text("name").notNull(),
    grams: real("grams").notNull(),
    kcal: real("kcal").notNull(),
    protein: real("protein").notNull(),
    carbs: real("carbs").notNull(),
    fat: real("fat").notNull(),
    sugar: real("sugar"),
    saturatedFat: real("saturated_fat"),
    fiber: real("fiber"),
    salt: real("salt"),
    micros: jsonb("micros").$type<Micros>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("entries_user_day_idx").on(t.userId, t.day)],
);

export const weights = pgTable(
  "weights",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    kg: real("kg").notNull(),
    // Optional body measurements in cm, body fat in percent.
    waistCm: real("waist_cm"),
    hipCm: real("hip_cm"),
    chestCm: real("chest_cm"),
    armCm: real("arm_cm"),
    thighCm: real("thigh_cm"),
    bodyFatPct: real("body_fat_pct"),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

/** Water drunk per user and day, in ml. */
export const water = pgTable(
  "water",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    ml: integer("ml").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

/** Optional progress photo for a weight entry, stored as a downscaled JPEG. */
export const weightPhotos = pgTable(
  "weight_photos",
  {
    userId: integer("user_id").notNull(),
    day: date("day").notNull(),
    mimeType: text("mime_type").notNull(),
    data: bytea("data").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.day] }),
    foreignKey({ columns: [t.userId, t.day], foreignColumns: [weights.userId, weights.day] }).onDelete("cascade"),
  ],
);

export const favorites = pgTable(
  "favorites",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    foodId: integer("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.foodId] })],
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    id: serial("id").primaryKey(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    foodId: integer("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    grams: real("grams").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("recipe_ingredients_recipe_idx").on(t.recipeId)],
);

/** A saved combination of foods (e.g. "Mein Frühstück") that can be logged in one tap. */
export const savedMeals = pgTable(
  "saved_meals",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("saved_meals_user_idx").on(t.userId)],
);

export const savedMealItems = pgTable(
  "saved_meal_items",
  {
    id: serial("id").primaryKey(),
    savedMealId: integer("saved_meal_id")
      .notNull()
      .references(() => savedMeals.id, { onDelete: "cascade" }),
    foodId: integer("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    grams: real("grams").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [index("saved_meal_items_meal_idx").on(t.savedMealId)],
);

export type Food = typeof foods.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Meal = (typeof mealEnum.enumValues)[number];

import {
  date,
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

export const sexEnum = pgEnum("sex", ["male", "female"]);
export const goalEnum = pgEnum("goal", ["lose", "maintain", "gain"]);
export const mealEnum = pgEnum("meal", ["breakfast", "lunch", "dinner", "snack"]);
export const foodSourceEnum = pgEnum("food_source", ["off", "custom"]);

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
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
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

export type Food = typeof foods.$inferSelect;
export type Entry = typeof entries.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Meal = (typeof mealEnum.enumValues)[number];

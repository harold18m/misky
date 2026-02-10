import {
    pgTable,
    serial,
    text,
    integer,
    boolean,
    timestamp,
    date,
    uniqueIndex,
    numeric,
} from "drizzle-orm/pg-core";
import { recipes } from "./menus";

export const weeklyPlans = pgTable(
    "weekly_plans",
    {
        id: serial("id").primaryKey(),
        userId: text("user_id").notNull(),
        weekStart: date("week_start").notNull(),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => ({
        userWeekUnique: uniqueIndex("weekly_plans_user_week_unique").on(
            t.userId,
            t.weekStart
        ),
    })
);

export const weeklyPlanItems = pgTable(
    "weekly_plan_items",
    {
        id: serial("id").primaryKey(),
        weeklyPlanId: integer("weekly_plan_id")
            .notNull()
            .references(() => weeklyPlans.id, { onDelete: "cascade" }),
        dayIndex: integer("day_index").notNull(),
        recipeId: integer("recipe_id")
            .notNull()
            .references(() => recipes.id, { onDelete: "cascade" }),
        isCompleted: boolean("is_completed").notNull().default(false),
        createdAt: timestamp("created_at").notNull().defaultNow(),
        updatedAt: timestamp("updated_at")
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (t) => ({
        planDayUnique: uniqueIndex("weekly_plan_items_plan_day_unique").on(
            t.weeklyPlanId,
            t.dayIndex
        ),
    })
);

export const shoppingItems = pgTable("shopping_items", {
    id: serial("id").primaryKey(),
    weeklyPlanId: integer("weekly_plan_id")
        .notNull()
        .references(() => weeklyPlans.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: text("amount").notNull().default("1"),
    unit: text("unit").notNull().default("unidad"),
    category: text("category").notNull().default("Otros"),
    isChecked: boolean("is_checked").notNull().default(false),
    estimatedPrice: numeric("estimated_price", { precision: 10, scale: 2 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
});

export type WeeklyPlanSelect = typeof weeklyPlans.$inferSelect;
export type WeeklyPlanItemSelect = typeof weeklyPlanItems.$inferSelect;
export type ShoppingItemSelect = typeof shoppingItems.$inferSelect;

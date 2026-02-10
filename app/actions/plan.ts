"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
    menuNutrition,
    menuRecipes,
    menus,
    recipes,
    weeklyPlanItems,
    weeklyPlans,
} from "@/db/schema";

export type WeekPlanItem = {
    dayIndex: number;
    recipeId: number;
    name: string;
    type: "starter" | "main" | "drink";
    calories: number | null;
    isCompleted: boolean;
};

export type WeekPlan = {
    weekStart: string;
    items: WeekPlanItem[];
};

function assertDayIndex(dayIndex: number) {
    if (dayIndex < 0 || dayIndex > 6) {
        throw new Error("dayIndex fuera de rango");
    }
}

async function getOrCreateWeeklyPlan(userId: string, weekStart: string) {
    const existing = await db.query.weeklyPlans.findFirst({
        where: (plan, { and, eq }) =>
            and(eq(plan.userId, userId), eq(plan.weekStart, weekStart)),
    });

    if (existing) return existing;

    const [created] = await db
        .insert(weeklyPlans)
        .values({ userId, weekStart })
        .returning();

    if (!created) {
        throw new Error("No se pudo crear el plan semanal");
    }

    return created;
}

export async function getWeekPlan(weekStart: string): Promise<WeekPlan> {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("Usuario no autenticado");
    }

    const plan = await db.query.weeklyPlans.findFirst({
        where: (weeklyPlan, { and, eq }) =>
            and(eq(weeklyPlan.userId, userId), eq(weeklyPlan.weekStart, weekStart)),
    });

    if (!plan) {
        return { weekStart, items: [] };
    }

    const items = await db
        .select({
            dayIndex: weeklyPlanItems.dayIndex,
            recipeId: weeklyPlanItems.recipeId,
            isCompleted: weeklyPlanItems.isCompleted,
            name: recipes.name,
            type: recipes.type,
        })
        .from(weeklyPlanItems)
        .innerJoin(recipes, eq(recipes.id, weeklyPlanItems.recipeId))
        .where(eq(weeklyPlanItems.weeklyPlanId, plan.id))
        .orderBy(weeklyPlanItems.dayIndex);

    const recipeIds = items.map((item) => item.recipeId);
    const caloriesByRecipe = new Map<number, number | null>();

    if (recipeIds.length > 0) {
        const nutritionRows = await db
            .select({
                recipeId: menuRecipes.recipeId,
                energyKcal: menuNutrition.energyKcal,
            })
            .from(menuRecipes)
            .innerJoin(menus, eq(menus.id, menuRecipes.menuId))
            .leftJoin(menuNutrition, eq(menuNutrition.menuId, menus.id))
            .where(inArray(menuRecipes.recipeId, recipeIds));

        for (const row of nutritionRows) {
            if (!caloriesByRecipe.has(row.recipeId)) {
                caloriesByRecipe.set(
                    row.recipeId,
                    row.energyKcal != null ? Number(row.energyKcal) : null
                );
            }
        }
    }

    return {
        weekStart,
        items: items.map((item) => ({
            dayIndex: item.dayIndex,
            recipeId: item.recipeId,
            name: item.name,
            type: item.type,
            calories: caloriesByRecipe.get(item.recipeId) ?? null,
            isCompleted: item.isCompleted,
        })),
    };
}

export async function setPlannedRecipe(
    weekStart: string,
    dayIndex: number,
    recipeId: number
) {
    assertDayIndex(dayIndex);

    const { userId } = await auth();
    if (!userId) {
        throw new Error("Usuario no autenticado");
    }

    const plan = await getOrCreateWeeklyPlan(userId, weekStart);

    await db
        .insert(weeklyPlanItems)
        .values({
            weeklyPlanId: plan.id,
            dayIndex,
            recipeId,
            isCompleted: false,
        })
        .onConflictDoUpdate({
            target: [weeklyPlanItems.weeklyPlanId, weeklyPlanItems.dayIndex],
            set: { recipeId, isCompleted: false, updatedAt: new Date() },
        });
}

export async function togglePlannedMeal(
    weekStart: string,
    dayIndex: number,
    isCompleted: boolean
) {
    assertDayIndex(dayIndex);

    const { userId } = await auth();
    if (!userId) {
        throw new Error("Usuario no autenticado");
    }

    const plan = await db.query.weeklyPlans.findFirst({
        where: (weeklyPlan, { and, eq }) =>
            and(eq(weeklyPlan.userId, userId), eq(weeklyPlan.weekStart, weekStart)),
    });

    if (!plan) return;

    await db
        .update(weeklyPlanItems)
        .set({ isCompleted, updatedAt: new Date() })
        .where(
            and(
                eq(weeklyPlanItems.weeklyPlanId, plan.id),
                eq(weeklyPlanItems.dayIndex, dayIndex)
            )
        );
}

export async function clearPlannedMeal(weekStart: string, dayIndex: number) {
    assertDayIndex(dayIndex);

    const { userId } = await auth();
    if (!userId) {
        throw new Error("Usuario no autenticado");
    }

    const plan = await db.query.weeklyPlans.findFirst({
        where: (weeklyPlan, { and, eq }) =>
            and(eq(weeklyPlan.userId, userId), eq(weeklyPlan.weekStart, weekStart)),
    });

    if (!plan) return;

    await db
        .delete(weeklyPlanItems)
        .where(
            and(
                eq(weeklyPlanItems.weeklyPlanId, plan.id),
                eq(weeklyPlanItems.dayIndex, dayIndex)
            )
        );
}

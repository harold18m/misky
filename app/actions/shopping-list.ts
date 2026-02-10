"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
    recipes,
    shoppingItems,
    weeklyPlanItems,
} from "@/db/schema";

export type ShoppingListItem = {
    id: number;
    name: string;
    amount: string;
    unit: string;
    category: string;
    isChecked: boolean;
    estimatedPrice: number | null;
};

export type ShoppingList = {
    weekStart: string;
    items: ShoppingListItem[];
};

function normalizeIngredient(raw: string): string {
    const cleaned = raw.replace(/\s+/g, " ").trim();
    if (!cleaned) return "";
    const withoutAmount = cleaned.replace(/^[\d.,/]+\s*/i, "");
    return withoutAmount || cleaned;
}

async function getPlanId(userId: string, weekStart: string) {
    return db.query.weeklyPlans.findFirst({
        where: (weeklyPlan, { and, eq }) =>
            and(eq(weeklyPlan.userId, userId), eq(weeklyPlan.weekStart, weekStart)),
    });
}

async function buildShoppingItemsFromPlan(weeklyPlanId: number) {
    const rows = await db
        .select({ ingredientsText: recipes.ingredientsText })
        .from(weeklyPlanItems)
        .innerJoin(recipes, eq(recipes.id, weeklyPlanItems.recipeId))
        .where(eq(weeklyPlanItems.weeklyPlanId, weeklyPlanId));

    const normalized = new Map<string, string>();
    for (const row of rows) {
        if (!row.ingredientsText) continue;
        const parts = row.ingredientsText
            .split(";")
            .map((part) => normalizeIngredient(part))
            .filter(Boolean);

        for (const part of parts) {
            const key = part.toLowerCase();
            if (!normalized.has(key)) {
                normalized.set(key, part);
            }
        }
    }

    const values = Array.from(normalized.values()).map((name) => ({
        weeklyPlanId,
        name,
        amount: "1",
        unit: "unidad",
        category: "Otros",
        isChecked: false,
    }));

    if (values.length === 0) return [];

    return db.insert(shoppingItems).values(values).returning();
}

function mapShoppingItem(item: typeof shoppingItems.$inferSelect): ShoppingListItem {
    return {
        id: item.id,
        name: item.name,
        amount: item.amount,
        unit: item.unit,
        category: item.category,
        isChecked: item.isChecked,
        estimatedPrice: item.estimatedPrice != null ? Number(item.estimatedPrice) : null,
    };
}

export async function getShoppingList(weekStart: string): Promise<ShoppingList> {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("Usuario no autenticado");
    }

    const plan = await getPlanId(userId, weekStart);
    if (!plan) {
        return { weekStart, items: [] };
    }

    let items = await db
        .select()
        .from(shoppingItems)
        .where(eq(shoppingItems.weeklyPlanId, plan.id));

    if (items.length === 0) {
        items = await buildShoppingItemsFromPlan(plan.id);
    }

    return {
        weekStart,
        items: items.map(mapShoppingItem),
    };
}

export async function addShoppingItem(params: {
    weekStart: string;
    name: string;
    amount?: string;
    unit?: string;
    category?: string;
}) {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("Usuario no autenticado");
    }

    const plan = await getPlanId(userId, params.weekStart);
    if (!plan) {
        throw new Error("Plan semanal no encontrado");
    }

    const [created] = await db
        .insert(shoppingItems)
        .values({
            weeklyPlanId: plan.id,
            name: params.name.trim(),
            amount: params.amount ?? "1",
            unit: params.unit ?? "unidad",
            category: params.category ?? "Otros",
            isChecked: false,
        })
        .returning();

    return created ? mapShoppingItem(created) : null;
}

export async function toggleShoppingItem(params: {
    weekStart: string;
    itemId: number;
    isChecked: boolean;
}) {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("Usuario no autenticado");
    }

    const plan = await getPlanId(userId, params.weekStart);
    if (!plan) return;

    await db
        .update(shoppingItems)
        .set({ isChecked: params.isChecked, updatedAt: new Date() })
        .where(
            and(
                eq(shoppingItems.id, params.itemId),
                eq(shoppingItems.weeklyPlanId, plan.id)
            )
        );
}

export async function deleteShoppingItem(params: {
    weekStart: string;
    itemId: number;
}) {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("Usuario no autenticado");
    }

    const plan = await getPlanId(userId, params.weekStart);
    if (!plan) return;

    await db
        .delete(shoppingItems)
        .where(
            and(
                eq(shoppingItems.id, params.itemId),
                eq(shoppingItems.weeklyPlanId, plan.id)
            )
        );
}

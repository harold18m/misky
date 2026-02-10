"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import {
    departments,
    menuNutrition,
    menuRecipes,
    menus,
    pdfDocuments,
    recipes,
    userPreferences,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export type SuggestionRecipe = {
    id: number;
    name: string;
    type: "starter" | "main" | "drink";
    typeLabel: string;
    region: string | null;
    imageUrl: string | null;
    ingredientsText: string | null;
    preparationText: string | null;
    baseServings: number;
    nutrition: {
        energyKcal: number | null;
        proteinG: number | null;
        carbsG: number | null;
    } | null;
};

const TYPE_LABELS: Record<"starter" | "main" | "drink", string> = {
    starter: "Entrada",
    main: "Plato principal",
    drink: "Refresco",
};

const RESTRICTION_KEYWORDS: Record<string, string[]> = {
    gluten: ["trigo", "pan", "harina", "cebada", "centeno"],
    lactosa: ["leche", "queso", "mantequilla", "yogurt", "crema"],
    vegetariano: [
        "pollo",
        "res",
        "cerdo",
        "pescado",
        "marisco",
        "carne",
        "jamon",
        "pavo",
    ],
    vegano: [
        "pollo",
        "res",
        "cerdo",
        "pescado",
        "marisco",
        "carne",
        "jamon",
        "pavo",
        "leche",
        "queso",
        "huevo",
        "mantequilla",
        "yogurt",
    ],
    mariscos: ["marisco", "camaron", "langostino", "pulpo", "calamar"],
};

function shuffle<T>(items: T[]): T[] {
    const next = [...items];
    for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
}

function shouldExcludeByRestrictions(
    ingredientsText: string | null,
    restrictions: string[]
): boolean {
    if (!ingredientsText) return false;
    if (restrictions.length === 0) return false;
    if (restrictions.includes("ninguna")) return false;

    const haystack = ingredientsText.toLowerCase();
    return restrictions.some((restriction) => {
        const keywords = RESTRICTION_KEYWORDS[restriction];
        if (!keywords) return false;
        return keywords.some((keyword) => haystack.includes(keyword));
    });
}

export async function getDailySuggestions(
    count: number = 3
): Promise<SuggestionRecipe[]> {
    const { userId } = await auth();

    if (!userId) {
        throw new Error("Usuario no autenticado");
    }

    const preferences = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.userId, userId),
        columns: { restrictions: true },
    });
    const restrictions = preferences?.restrictions ?? [];

    const rows = await db
        .select({
            recipeId: recipes.id,
            name: recipes.name,
            type: recipes.type,
            ingredientsText: recipes.ingredientsText,
            preparationText: recipes.preparationText,
            imageUrl: menus.imageUrl,
            departmentName: departments.name,
            energyKcal: menuNutrition.energyKcal,
            proteinG: menuNutrition.proteinG,
            carbsG: menuNutrition.carbsG,
        })
        .from(recipes)
        .leftJoin(menuRecipes, eq(menuRecipes.recipeId, recipes.id))
        .leftJoin(menus, eq(menus.id, menuRecipes.menuId))
        .leftJoin(pdfDocuments, eq(pdfDocuments.id, menus.pdfDocumentId))
        .leftJoin(departments, eq(departments.id, pdfDocuments.departmentId))
        .leftJoin(menuNutrition, eq(menuNutrition.menuId, menus.id))
        .limit(80);

    const byRecipe = new Map<number, SuggestionRecipe>();
    for (const row of rows) {
        if (!byRecipe.has(row.recipeId)) {
            if (shouldExcludeByRestrictions(row.ingredientsText, restrictions)) {
                continue;
            }

            byRecipe.set(row.recipeId, {
                id: row.recipeId,
                name: row.name,
                type: row.type,
                typeLabel: TYPE_LABELS[row.type],
                region: row.departmentName ?? null,
                imageUrl: row.imageUrl ?? null,
                ingredientsText: row.ingredientsText ?? null,
                preparationText: row.preparationText ?? null,
                baseServings: 4,
                nutrition:
                    row.energyKcal != null || row.proteinG != null || row.carbsG != null
                        ? {
                            energyKcal:
                                row.energyKcal != null ? Number(row.energyKcal) : null,
                            proteinG:
                                row.proteinG != null ? Number(row.proteinG) : null,
                            carbsG: row.carbsG != null ? Number(row.carbsG) : null,
                        }
                        : null,
            });
        }
    }

    const candidates = Array.from(byRecipe.values());
    if (candidates.length === 0) return [];

    return shuffle(candidates).slice(0, count);
}

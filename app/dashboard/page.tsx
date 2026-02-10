import { currentUser } from "@clerk/nextjs/server";
import { getWeekPlan } from "@/app/actions/plan";
import { getDailySuggestions, getRecipesByIds } from "@/app/actions/suggestions";
import { formatDateKey, getWeekStart } from "@/lib/week";
import DashboardHomeClient from "./DashboardHomeClient";
import type { Metadata } from "next";
import type { SuggestionRecipe } from "@/app/actions/suggestions";

export const metadata: Metadata = {
  title: "Mi Plan | Misky",
  description: "Tu planificador de comidas personalizado.",
};

export default async function DashboardPage() {
  const user = await currentUser();
  const weekStart = getWeekStart(new Date());
  const weekStartKey = formatDateKey(weekStart);
  const [weekPlan, suggestions] = await Promise.all([
    getWeekPlan(weekStartKey),
    getDailySuggestions(4),
  ]);

  const plannedRecipeIds = Array.from(
    new Set(weekPlan.items.map((item) => item.recipeId))
  );
  const plannedRecipes = await getRecipesByIds(plannedRecipeIds);
  const plannedById = new Map(plannedRecipes.map((recipe) => [recipe.id, recipe]));
  const plannedRecipesByDate: Record<string, SuggestionRecipe> = {};

  const plannedDays = weekPlan.items.reduce<string[]>((acc, item) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + item.dayIndex);
    const dateKey = formatDateKey(date);
    const recipe = plannedById.get(item.recipeId);
    if (recipe) {
      plannedRecipesByDate[dateKey] = recipe;
      acc.push(dateKey);
    }
    return acc;
  }, []);

  return (
    <DashboardHomeClient
      userName={user?.firstName || "Usuario"}
      initialSuggestions={suggestions}
      plannedDays={plannedDays}
      plannedRecipesByDate={plannedRecipesByDate}
    />
  );
}

import { currentUser } from "@clerk/nextjs/server";
import { getRecetas } from "@/app/actions/recetas";
import { getWeekPlan } from "@/app/actions/plan";
import { formatDateKey, getWeekStart } from "@/lib/week";
import PlanClient from "./PlanClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plan Semanal | Misky",
  description: "Tu planificación de comidas para la semana.",
};

export default async function PlanPage() {
  const user = await currentUser();
  const weekStart = getWeekStart(new Date());
  const weekStartKey = formatDateKey(weekStart);
  const [weekPlan, recipes] = await Promise.all([
    getWeekPlan(weekStartKey),
    getRecetas(),
  ]);

  return (
    <PlanClient
      userName={user?.firstName || "Usuario"}
      initialWeekStart={weekStartKey}
      initialPlanItems={weekPlan.items}
      recipeOptions={recipes.map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        type: recipe.type,
        typeLabel: recipe.typeLabel,
        ingredientsText: recipe.ingredientsText,
      }))}
    />
  );
}

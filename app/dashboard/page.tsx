import { currentUser } from "@clerk/nextjs/server";
import { getWeekPlan } from "@/app/actions/plan";
import { getDailySuggestions } from "@/app/actions/suggestions";
import { formatDateKey, getWeekStart } from "@/lib/week";
import DashboardHomeClient from "./DashboardHomeClient";
import type { Metadata } from "next";

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

  const plannedDays = weekPlan.items.map((item) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + item.dayIndex);
    return formatDateKey(date);
  });

  return (
    <DashboardHomeClient
      userName={user?.firstName || "Usuario"}
      initialSuggestions={suggestions}
      plannedDays={plannedDays}
    />
  );
}

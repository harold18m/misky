import { currentUser } from "@clerk/nextjs/server";
import { getShoppingList } from "@/app/actions/shopping-list";
import { formatDateKey, getWeekStart } from "@/lib/week";
import ComprasClient from "./ComprasClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lista de Compras | Misky",
  description: "Tu lista de compras para la semana.",
};

export default async function ComprasPage() {
  const user = await currentUser();
  const weekStart = getWeekStart(new Date());
  const weekStartKey = formatDateKey(weekStart);
  const shoppingList = await getShoppingList(weekStartKey);

  return (
    <ComprasClient
      userName={user?.firstName || "Usuario"}
      initialItems={shoppingList.items}
      weekStart={weekStartKey}
    />
  );
}

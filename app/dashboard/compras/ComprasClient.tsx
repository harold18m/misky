"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Check,
  Plus,
  Trash2,
  Share2,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import DashboardShell from "../components/DashboardShell";
import {
  addShoppingItem,
  deleteShoppingItem,
  toggleShoppingItem,
} from "@/app/actions/shopping-list";
import type { ShoppingListItem } from "@/app/actions/shopping-list";

const CATEGORIES = ["Carnes", "Verduras", "Abarrotes", "Lácteos", "Otros"];

const CATEGORY_EMOJIS: Record<string, string> = {
  Carnes: "🥩",
  Verduras: "🥬",
  Abarrotes: "🛒",
  "Lácteos": "🥛",
  Otros: "📦",
};

function ShoppingItemRow({
  item,
  onToggle,
  onDelete,
}: Readonly<{
  item: ShoppingListItem;
  onToggle: () => void;
  onDelete: () => void;
}>) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${item.isChecked
          ? "bg-accent-green/30"
          : "bg-card hover:bg-accent-yellow/20"
        }`}
    >
      <button
        onClick={onToggle}
        className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center transition-all ${item.isChecked
            ? "bg-success text-white"
            : "border-2 border-card-border hover:border-success"
          }`}
      >
        {item.isChecked && <Check className="w-4 h-4" />}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`font-medium ${item.isChecked ? "line-through text-muted-foreground" : "text-foreground"
            }`}
        >
          {item.name}
        </p>
        <p className="text-sm text-muted-foreground">
          {item.amount} {item.unit}
        </p>
      </div>

      {item.estimatedPrice != null && (
        <span
          className={`text-sm font-medium ${item.isChecked ? "text-muted-foreground" : "text-primary"
            }`}
        >
          S/ {item.estimatedPrice.toFixed(2)}
        </span>
      )}

      <button
        onClick={onDelete}
        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function CategorySection({
  category,
  items,
  onToggleItem,
  onDeleteItem,
}: Readonly<{
  category: string;
  items: ShoppingListItem[];
  onToggleItem: (id: number) => void;
  onDeleteItem: (id: number) => void;
}>) {
  const [isExpanded, setIsExpanded] = useState(true);
  const checkedCount = items.filter((i) => i.isChecked).length;
  const totalPrice = items.reduce((sum, i) => sum + (i.estimatedPrice || 0), 0);

  return (
    <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent-yellow/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {CATEGORY_EMOJIS[category] ?? "📦"}
          </span>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">{category}</h3>
            <p className="text-sm text-muted-foreground">
              {checkedCount}/{items.length} completados • S/ {totalPrice.toFixed(2)}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {items.map((item) => (
            <ShoppingItemRow
              key={item.id}
              item={item}
              onToggle={() => onToggleItem(item.id)}
              onDelete={() => onDeleteItem(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ComprasClient({
  userName,
  initialItems,
  weekStart,
}: Readonly<{
  userName: string;
  initialItems: ShoppingListItem[];
  weekStart: string;
}>) {
  const [shoppingList, setShoppingList] = useState(initialItems);
  const [newItemName, setNewItemName] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleToggleItem = (id: number) => {
    setShoppingList((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isChecked: !item.isChecked } : item
      )
    );

    const target = shoppingList.find((item) => item.id === id);
    if (!target) return;

    startTransition(() => {
      void toggleShoppingItem({
        weekStart,
        itemId: id,
        isChecked: !target.isChecked,
      });
    });
  };

  const handleDeleteItem = (id: number) => {
    setShoppingList((prev) => prev.filter((item) => item.id !== id));

    startTransition(() => {
      void deleteShoppingItem({ weekStart, itemId: id });
    });
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const name = newItemName.trim();
    setNewItemName("");

    startTransition(() => {
      void addShoppingItem({ weekStart, name }).then((created) => {
        if (!created) return;
        setShoppingList((prev) => [...prev, created]);
      });
    });
  };

  const categories = useMemo(() => {
    const next = new Set(CATEGORIES);
    for (const item of shoppingList) {
      next.add(item.category);
    }
    return Array.from(next);
  }, [shoppingList]);

  const groupedItems = categories.reduce(
    (acc, category) => {
      acc[category] = shoppingList.filter((item) => item.category === category);
      return acc;
    },
    {} as Record<string, ShoppingListItem[]>
  );

  const totalItems = shoppingList.length;
  const checkedItems = shoppingList.filter((i) => i.isChecked).length;
  const totalPrice = shoppingList.reduce(
    (sum, i) => sum + (i.estimatedPrice || 0),
    0
  );
  const remainingPrice = shoppingList
    .filter((i) => !i.isChecked)
    .reduce((sum, i) => sum + (i.estimatedPrice || 0), 0);

  return (
    <DashboardShell userName={userName} title="Lista de Compras" subtitle="Ingredientes para tu plan semanal">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card rounded-xl border border-card-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalItems}</p>
            <p className="text-xs text-muted-foreground">Items totales</p>
          </div>
          <div className="bg-card rounded-xl border border-card-border p-4 text-center">
            <p className="text-2xl font-bold text-success">{checkedItems}</p>
            <p className="text-xs text-muted-foreground">Completados</p>
          </div>
          <div className="bg-card rounded-xl border border-card-border p-4 text-center">
            <p className="text-2xl font-bold text-primary">S/ {totalPrice.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Total estimado</p>
          </div>
          <div className="bg-card rounded-xl border border-card-border p-4 text-center">
            <p className="text-2xl font-bold text-secondary">S/ {remainingPrice.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground">Por comprar</p>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-card rounded-xl border border-card-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Progreso de compras</span>
            <span className="text-sm text-muted-foreground">
              {checkedItems}/{totalItems}
            </span>
          </div>
          <div className="h-3 bg-card-border rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all duration-300"
              style={{ width: `${(checkedItems / totalItems) * 100}%` }}
            />
          </div>
        </div>

        {/* Add Item */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Agregar item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
            className="flex-1 h-12 px-4 rounded-xl border border-card-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleAddItem}
            disabled={isPending}
            className="h-12 px-6 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl flex items-center gap-2 transition-colors disabled:opacity-70"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Agregar</span>
          </button>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {categories.map((category) => {
            const items = groupedItems[category];
            if (items.length === 0) return null;
            return (
              <CategorySection
                key={category}
                category={category}
                items={items}
                onToggleItem={handleToggleItem}
                onDeleteItem={handleDeleteItem}
              />
            );
          })}
        </div>

        {/* Empty State */}
        {shoppingList.length === 0 && (
          <div className="text-center py-12">
            <span className="text-6xl mb-4 block">🛒</span>
            <h3 className="text-xl font-bold text-foreground mb-2">Lista vacía</h3>
            <p className="text-muted-foreground mb-4">
              Planifica tus comidas y generaremos tu lista de compras automáticamente.
            </p>
            <a
              href="/dashboard/plan"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-xl transition-colors"
            >
              Ir al Plan Semanal
            </a>
          </div>
        )}

        {/* Actions */}
        {shoppingList.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="flex-1 py-3 border-2 border-card-border text-foreground font-medium rounded-xl flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors">
              <Share2 className="w-5 h-5" />
              Compartir lista
            </button>
            <button className="flex-1 py-3 border-2 border-card-border text-foreground font-medium rounded-xl flex items-center justify-center gap-2 hover:border-primary hover:text-primary transition-colors">
              <Download className="w-5 h-5" />
              Descargar PDF
            </button>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

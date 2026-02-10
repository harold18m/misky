"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Flame,
  ShoppingCart,
  ChefHat,
  Check,
  RefreshCw,
  Heart,
  Share2,
  Sparkles,
} from "lucide-react";
import DashboardShell from "./components/DashboardShell";
import { formatDateKey } from "@/lib/week";
import type { SuggestionRecipe } from "@/app/actions/suggestions";

// Types
type Recipe = SuggestionRecipe;

const TYPE_EMOJI: Record<Recipe["type"], string> = {
  starter: "🥗",
  main: "🍲",
  drink: "🥤",
};

const DAYS_OF_WEEK = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

// Componente: Tarjeta de Sugerencia
function SuggestionCard({
  recipe,
  isSelected,
  onSelect,
  servings,
}: Readonly<{
  recipe: Recipe;
  isSelected: boolean;
  onSelect: () => void;
  servings: number;
}>) {
  const multiplier = servings / recipe.baseServings;
  const calories = recipe.nutrition?.energyKcal ?? null;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 overflow-hidden transition-all ${isSelected
        ? "border-primary bg-primary-light shadow-lg shadow-primary/20"
        : "border-card-border bg-card hover:border-primary/50 hover:shadow-md"
        }`}
    >
      <div className="relative h-32 sm:h-28 bg-linear-to-br from-accent-yellow to-accent-orange flex items-center justify-center">
        <span className="text-5xl sm:text-4xl">{TYPE_EMOJI[recipe.type]}</span>
        {isSelected && (
          <div className="absolute top-2 right-2 w-7 h-7 bg-primary rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
        )}
        <div className="absolute bottom-2 left-2">
          <span className="px-2 py-0.5 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-secondary">
            {recipe.region ?? "Peru"}
          </span>
        </div>
      </div>
      <div className="p-3">
        <h3 className="font-bold text-foreground mb-1 text-sm">{recipe.name}</h3>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          <span className="rounded-full bg-card-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {recipe.typeLabel}
          </span>
          {calories != null && (
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3" />
              {Math.round(calories * multiplier)} kcal
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Sugerencia del dia</span>
        </div>
      </div>
    </button>
  );
}

// Componente: Detalle de Receta
function SelectedRecipeDetail({
  recipe,
  servings,
  onChangeServings,
}: Readonly<{
  recipe: Recipe;
  servings: number;
  onChangeServings: (delta: number) => void;
}>) {
  const [activeTab, setActiveTab] = useState<"ingredientes" | "preparacion">("ingredientes");
  const multiplier = servings / recipe.baseServings;
  const ingredients = recipe.ingredientsText
    ? recipe.ingredientsText
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => ({ name: item, amount: "", unit: "" }))
    : [];
  const steps = recipe.preparationText
    ? recipe.preparationText
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean)
    : [];

  const adjustAmount = (amount: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    const adjusted = num * multiplier;
    return adjusted % 1 === 0 ? adjusted.toString() : adjusted.toFixed(1);
  };

  return (
    <div className="bg-card rounded-2xl border border-card-border overflow-hidden">
      <div className="relative h-48 sm:h-56 lg:h-64 overflow-hidden bg-linear-to-br from-accent-yellow via-accent-orange to-primary/30 flex items-center justify-center">
        {recipe.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.imageUrl}
            alt={recipe.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="text-7xl sm:text-8xl lg:text-9xl">
            {TYPE_EMOJI[recipe.type]}
          </span>
        )}
        <div className="absolute top-4 right-4 flex gap-2">
          <button className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors">
            <Heart className="w-5 h-5 text-muted-foreground" />
          </button>
          <button className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors">
            <Share2 className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="absolute bottom-4 left-4">
          <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-secondary">
            📍 {recipe.region ?? "Peru"}
          </span>
        </div>
      </div>

      <div className="p-5 lg:p-6 border-b border-card-border">
        <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">{recipe.name}</h2>
        <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-4">
          <div className="text-center p-2 sm:p-3 bg-accent-yellow/50 rounded-xl">
            <p className="text-base sm:text-lg font-bold text-foreground">
              {recipe.nutrition?.energyKcal != null
                ? Math.round(recipe.nutrition.energyKcal * multiplier)
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">kcal</p>
          </div>
          <div className="text-center p-2 sm:p-3 bg-accent-green/50 rounded-xl">
            <p className="text-base sm:text-lg font-bold text-foreground">
              {recipe.nutrition?.proteinG != null
                ? Math.round(recipe.nutrition.proteinG * multiplier)
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">proteína</p>
          </div>
          <div className="text-center p-2 sm:p-3 bg-accent-blue/50 rounded-xl">
            <p className="text-base sm:text-lg font-bold text-foreground">
              {recipe.nutrition?.carbsG != null
                ? Math.round(recipe.nutrition.carbsG * multiplier)
                : "—"}
            </p>
            <p className="text-xs text-muted-foreground">carbs</p>
          </div>
          <div className="text-center p-2 sm:p-3 bg-accent-purple/50 rounded-xl">
            <p className="text-base sm:text-lg font-bold text-foreground">—</p>
            <p className="text-xs text-muted-foreground">grasas</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center justify-between flex-1 p-3 sm:p-4 bg-accent-yellow/30 rounded-xl">
            <div className="flex items-center gap-2 sm:gap-3">
              <Users className="w-5 h-5 text-primary" />
              <span className="text-sm text-foreground">Porciones</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => onChangeServings(-1)}
                disabled={servings <= 1}
                className="w-8 h-8 rounded-full bg-white border border-card-border flex items-center justify-center hover:border-primary disabled:opacity-40 transition-colors"
              >
                -
              </button>
              <span className="text-xl font-bold text-primary w-6 text-center">{servings}</span>
              <button
                onClick={() => onChangeServings(1)}
                disabled={servings >= 12}
                className="w-8 h-8 rounded-full bg-white border border-card-border flex items-center justify-center hover:border-primary disabled:opacity-40 transition-colors"
              >
                +
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-center gap-4 p-3 sm:p-4 bg-primary/10 rounded-xl sm:min-w-40">
            <span className="text-sm text-foreground sm:hidden">Tipo</span>
            <div className="text-right sm:text-center">
              <p className="text-2xl font-bold text-primary">
                {recipe.typeLabel}
              </p>
              <p className="text-xs text-muted-foreground hidden sm:block">
                tipo de receta
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <ChefHat className="w-4 h-4" />
            {recipe.typeLabel}
          </span>
        </div>
      </div>

      <div className="flex border-b border-card-border">
        <button
          onClick={() => setActiveTab("ingredientes")}
          className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === "ingredientes" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            }`}
        >
          🥕 Ingredientes ({ingredients.length})
        </button>
        <button
          onClick={() => setActiveTab("preparacion")}
          className={`flex-1 py-4 text-sm font-semibold transition-colors ${activeTab === "preparacion" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
            }`}
        >
          👨‍🍳 Preparación ({steps.length} pasos)
        </button>
      </div>

      <div className="p-5 lg:p-6">
        {activeTab === "ingredientes" ? (
          <ul className="space-y-2 sm:space-y-3">
            {ingredients.map((ing, index) => (
              <li key={index} className="flex items-center justify-between py-2 border-b border-card-border last:border-0">
                <span className="text-foreground">{ing.name}</span>
                {(ing.amount || ing.unit) && (
                  <span className="text-sm font-medium text-primary">
                    {adjustAmount(ing.amount)} {ing.unit}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <ol className="space-y-4 lg:space-y-5">
            {steps.map((step, index) => (
              <li key={index} className="flex gap-3 sm:gap-4">
                <span className="shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </span>
                <p className="text-foreground leading-relaxed pt-1">{step}</p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="p-5 lg:p-6 border-t border-card-border">
        <button className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors btn-primary-glow">
          <ShoppingCart className="w-5 h-5" />
          Agregar a lista de compras
        </button>
      </div>
    </div>
  );
}

// Componente: Calendario Semanal
function WeeklyCalendar({
  selectedDate,
  onSelectDate,
  plannedDays,
}: Readonly<{
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  plannedDays: string[];
}>) {
  const today = new Date();
  const startOfWeek = new Date(selectedDate);
  startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return date;
  });

  return (
    <div className="flex justify-between gap-1 sm:gap-2">
      {days.map((date) => {
        const isSelected = date.toDateString() === selectedDate.toDateString();
        const isToday = date.toDateString() === today.toDateString();
        const isPlanned = plannedDays.includes(formatDateKey(date));

        return (
          <button
            key={date.toISOString()}
            onClick={() => onSelectDate(date)}
            className={`flex-1 flex flex-col items-center py-2 sm:py-3 rounded-xl transition-all ${isSelected ? "bg-primary text-white" : isToday ? "bg-primary-light text-primary" : "hover:bg-accent-yellow/50"
              }`}
          >
            <span className={`text-xs sm:text-sm ${isSelected ? "text-white/70" : "text-muted-foreground"}`}>
              {DAYS_OF_WEEK[date.getDay()]}
            </span>
            <span className={`text-lg sm:text-xl font-bold ${isSelected ? "text-white" : "text-foreground"}`}>
              {date.getDate()}
            </span>
            {isPlanned && !isSelected && <div className="w-1.5 h-1.5 rounded-full bg-success mt-1" />}
            {isSelected && isPlanned && <div className="w-1.5 h-1.5 rounded-full bg-white mt-1" />}
          </button>
        );
      })}
    </div>
  );
}

// Componente: Header con navegación de fecha
function DateHeader({
  selectedDate,
  onNavigateDay,
}: Readonly<{
  selectedDate: Date;
  onNavigateDay: (direction: number) => void;
}>) {
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" };
    return date.toLocaleDateString("es-PE", options);
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <button onClick={() => onNavigateDay(-1)} className="p-2 hover:bg-accent-yellow/50 rounded-xl transition-colors">
        <ChevronLeft className="w-5 h-5 text-muted-foreground" />
      </button>
      <h2 className="text-base sm:text-lg font-semibold text-foreground capitalize">{formatDate(selectedDate)}</h2>
      <button onClick={() => onNavigateDay(1)} className="p-2 hover:bg-accent-yellow/50 rounded-xl transition-colors">
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </button>
    </div>
  );
}

// Main Component
export default function DashboardHomeClient({
  userName,
  initialSuggestions,
  plannedDays,
  plannedRecipesByDate,
}: Readonly<{
  userName: string;
  initialSuggestions: Recipe[];
  plannedDays: string[];
  plannedRecipesByDate: Record<string, Recipe>;
}>) {
  const today = new Date();
  const todayKey = formatDateKey(today);
  const todayPlanned = plannedRecipesByDate[todayKey] ?? null;
  const initialList = todayPlanned
    ? [
      todayPlanned,
      ...initialSuggestions.filter((recipe) => recipe.id !== todayPlanned.id),
    ]
    : initialSuggestions;

  const [selectedDate, setSelectedDate] = useState(today);
  const [dailySuggestions, setDailySuggestions] = useState(initialList);
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(
    todayPlanned?.id ?? initialList[0]?.id ?? null
  );
  const [servings, setServings] = useState(4);

  const selectedDateKey = formatDateKey(selectedDate);
  const plannedRecipe = plannedRecipesByDate[selectedDateKey] ?? null;

  const selectedRecipe = useMemo(
    () =>
      dailySuggestions.find((recipe) => recipe.id === selectedRecipeId) ??
      dailySuggestions[0] ??
      null,
    [dailySuggestions, selectedRecipeId]
  );

  const applyDateSelection = (date: Date) => {
    const dateKey = formatDateKey(date);
    const planned = plannedRecipesByDate[dateKey] ?? null;
    setSelectedDate(date);

    if (planned) {
      setDailySuggestions((prev) => {
        const exists = prev.some((recipe) => recipe.id === planned.id);
        if (exists) return prev;
        return [planned, ...prev];
      });
      setSelectedRecipeId(planned.id);
    }
  };

  const navigateDay = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + direction);
    applyDateSelection(newDate);
  };

  const handleChangeServings = (delta: number) => {
    setServings((prev) => Math.max(1, Math.min(12, prev + delta)));
  };

  const handleRefreshSuggestions = () => {
    setDailySuggestions((prev) => {
      if (prev.length < 2) return prev;
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      setSelectedRecipeId(next[0]?.id ?? null);
      return next;
    });
  };

  if (!selectedRecipe) {
    return (
      <DashboardShell
        userName={userName}
        title="Tu almuerzo de hoy"
        subtitle="Elige que cocinar hoy"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="rounded-2xl border border-card-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Aun no hay sugerencias disponibles. Sube recetas o intenta mas
              tarde.
            </p>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell userName={userName} title="Tu almuerzo de hoy" subtitle="Elige qué cocinar hoy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Date Navigation - Mobile only */}
        <div className="lg:hidden">
          <DateHeader selectedDate={selectedDate} onNavigateDay={navigateDay} />
        </div>

        {/* Weekly Calendar */}
        <div className="mb-6">
          <WeeklyCalendar
            selectedDate={selectedDate}
            onSelectDate={applyDateSelection}
            plannedDays={plannedDays}
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Suggestions Column */}
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="lg:sticky lg:top-32">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-bold text-foreground">Elige tu almuerzo</h2>
                </div>
                <button
                  onClick={handleRefreshSuggestions}
                  className="flex items-center gap-1 text-sm text-primary hover:text-primary-hover transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Otras</span>
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:flex lg:flex-col">
                {dailySuggestions.map((recipe) => (
                  <div key={recipe.id} className="min-w-50 sm:min-w-0">
                    <SuggestionCard
                      recipe={recipe}
                      isSelected={selectedRecipe.id === recipe.id}
                      onSelect={() => setSelectedRecipeId(recipe.id)}
                      servings={servings}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recipe Detail Column */}
          <div className="lg:col-span-8 xl:col-span-9">
            <div className="flex items-center justify-between gap-2 mb-4 lg:hidden">
              <div className="flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">
                  Tu almuerzo de hoy
                </h2>
              </div>
              {plannedRecipe && (
                <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                  Planificado
                </span>
              )}
            </div>
            <SelectedRecipeDetail
              recipe={selectedRecipe}
              servings={servings}
              onChangeServings={handleChangeServings}
            />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

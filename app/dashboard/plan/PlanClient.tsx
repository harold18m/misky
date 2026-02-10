"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Check,
  Flame,
  Sparkles,
} from "lucide-react";
import DashboardShell from "../components/DashboardShell";
import {
  clearPlannedMeal,
  getWeekPlan,
  setPlannedRecipe,
  togglePlannedMeal,
} from "@/app/actions/plan";
import { formatDateKey, getWeekDays, getWeekStart } from "@/lib/week";
import type { WeekPlanItem } from "@/app/actions/plan";

// Types
type PlannedMeal = {
  recipeId: number;
  name: string;
  type: "starter" | "main" | "drink";
  typeLabel: string;
  calories: number | null;
  isCompleted: boolean;
};

type RecipeOption = {
  id: number;
  name: string;
  type: "starter" | "main" | "drink";
  typeLabel: string;
  ingredientsText: string | null;
};

type DayPlan = {
  date: Date;
  meal: PlannedMeal | null;
};

const DAYS_OF_WEEK = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const TYPE_EMOJI: Record<"starter" | "main" | "drink", string> = {
  starter: "🥗",
  main: "🍲",
  drink: "🥤",
};

function buildWeekPlan(
  weekDays: Date[],
  items: WeekPlanItem[],
  optionsById: Map<number, RecipeOption>
): DayPlan[] {
  const byDay = new Map(items.map((item) => [item.dayIndex, item]));
  return weekDays.map((date, index) => {
    const item = byDay.get(index);
    if (!item) return { date, meal: null };

    const option = optionsById.get(item.recipeId);
    return {
      date,
      meal: {
        recipeId: item.recipeId,
        name: item.name,
        type: item.type,
        typeLabel: option?.typeLabel ?? "Plato",
        calories: item.calories,
        isCompleted: item.isCompleted,
      },
    };
  });
}

// Componente: Card del día
function DayCard({
  dayPlan,
  isToday,
  onToggleComplete,
  onAddMeal,
  onClearMeal,
}: Readonly<{
  dayPlan: DayPlan;
  isToday: boolean;
  onToggleComplete: () => void;
  onAddMeal: () => void;
  onClearMeal: () => void;
}>) {
  const dayName = DAYS_OF_WEEK[dayPlan.date.getDay()];
  const dayNumber = dayPlan.date.getDate();

  return (
    <div
      className={`rounded-2xl border-2 overflow-hidden transition-all ${isToday
          ? "border-primary bg-primary-light/50"
          : "border-card-border bg-card hover:border-primary/30"
        }`}
    >
      {/* Day Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between ${isToday ? "bg-primary text-white" : "bg-card-border/30"
          }`}
      >
        <div>
          <p className={`text-xs ${isToday ? "text-white/70" : "text-muted-foreground"}`}>
            {dayName}
          </p>
          <p className={`text-xl font-bold ${isToday ? "text-white" : "text-foreground"}`}>
            {dayNumber}
          </p>
        </div>
        {isToday && (
          <span className="px-2 py-1 bg-white/20 rounded-full text-xs font-medium">Hoy</span>
        )}
      </div>

      {/* Meal Content */}
      <div className="p-4">
        {dayPlan.meal ? (
          <div className="space-y-3">
            {/* Meal Info */}
            <div className="flex items-start gap-3">
              <span className="text-3xl">{TYPE_EMOJI[dayPlan.meal.type]}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{dayPlan.meal.name}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span className="rounded-full bg-card-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    {dayPlan.meal.typeLabel}
                  </span>
                  {dayPlan.meal.calories != null && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Flame className="w-3 h-3" />
                        {Math.round(dayPlan.meal.calories)} kcal
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Cost & Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-card-border">
              <span className="text-xs text-muted-foreground">Planificado</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={onClearMeal}
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Quitar
                </button>
                <button
                  onClick={onToggleComplete}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${dayPlan.meal.isCompleted
                      ? "bg-success text-white"
                      : "border-2 border-card-border hover:border-success"
                    }`}
                >
                  {dayPlan.meal.isCompleted && <Check className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={onAddMeal}
            className="w-full py-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary transition-colors group"
          >
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-card-border group-hover:border-primary flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm">Agregar almuerzo</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Componente: Vista de lista (mobile)
function ListView({
  weekPlan,
  today,
  onToggleComplete,
  onAddMeal,
  onClearMeal,
}: Readonly<{
  weekPlan: DayPlan[];
  today: Date;
  onToggleComplete: (index: number) => void;
  onAddMeal: (index: number) => void;
  onClearMeal: (index: number) => void;
}>) {
  return (
    <div className="space-y-3">
      {weekPlan.map((dayPlan, index) => {
        const isToday = dayPlan.date.toDateString() === today.toDateString();
        const isPast = dayPlan.date < today && !isToday;

        return (
          <div
            key={dayPlan.date.toISOString()}
            className={`rounded-xl border overflow-hidden transition-all ${isToday
                ? "border-primary bg-primary-light/30"
                : isPast
                  ? "border-card-border bg-card/50 opacity-60"
                  : "border-card-border bg-card"
              }`}
          >
            <div className="flex items-center">
              {/* Date Column */}
              <div
                className={`w-16 sm:w-20 shrink-0 py-4 flex flex-col items-center justify-center border-r ${isToday ? "bg-primary text-white border-primary" : "bg-card-border/20 border-card-border"
                  }`}
              >
                <span className={`text-xs ${isToday ? "text-white/70" : "text-muted-foreground"}`}>
                  {DAYS_SHORT[dayPlan.date.getDay()]}
                </span>
                <span className={`text-2xl font-bold ${isToday ? "text-white" : "text-foreground"}`}>
                  {dayPlan.date.getDate()}
                </span>
              </div>

              {/* Meal Content */}
              <div className="flex-1 p-3 sm:p-4">
                {dayPlan.meal ? (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl sm:text-3xl">
                      {TYPE_EMOJI[dayPlan.meal.type]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{dayPlan.meal.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-card-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {dayPlan.meal.typeLabel}
                        </span>
                        {dayPlan.meal.calories != null && (
                          <>
                            <span>•</span>
                            <span>{Math.round(dayPlan.meal.calories)} kcal</span>
                          </>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleComplete(index)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 ${dayPlan.meal.isCompleted
                          ? "bg-success text-white"
                          : "border-2 border-card-border hover:border-success"
                        }`}
                    >
                      {dayPlan.meal.isCompleted && <Check className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => onClearMeal(index)}
                      className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onAddMeal(index)}
                    className="w-full flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-card-border flex items-center justify-center">
                      <Plus className="w-4 h-4" />
                    </div>
                    <span className="text-sm">Agregar almuerzo</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Componente: Resumen semanal
function WeeklySummary({ weekPlan }: Readonly<{ weekPlan: DayPlan[] }>) {
  const plannedMeals = weekPlan.filter((d) => d.meal !== null);
  const completedMeals = plannedMeals.filter((d) => d.meal?.isCompleted);
  const totalCalories = plannedMeals.reduce(
    (sum, d) => sum + (d.meal?.calories || 0),
    0
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="bg-card rounded-xl border border-card-border p-4 text-center">
        <p className="text-2xl sm:text-3xl font-bold text-foreground">{plannedMeals.length}/7</p>
        <p className="text-xs sm:text-sm text-muted-foreground">Días planificados</p>
      </div>
      <div className="bg-card rounded-xl border border-card-border p-4 text-center">
        <p className="text-2xl sm:text-3xl font-bold text-success">{completedMeals.length}</p>
        <p className="text-xs sm:text-sm text-muted-foreground">Completados</p>
      </div>
      <div className="bg-card rounded-xl border border-card-border p-4 text-center">
        <p className="text-2xl sm:text-3xl font-bold text-primary">
          {totalCalories ? Math.round(totalCalories) : "—"}
        </p>
        <p className="text-xs sm:text-sm text-muted-foreground">kcal estimadas</p>
      </div>
      <div className="bg-card rounded-xl border border-card-border p-4 text-center">
        <p className="text-2xl sm:text-3xl font-bold text-secondary">{plannedMeals.length}</p>
        <p className="text-xs sm:text-sm text-muted-foreground">Recetas en plan</p>
      </div>
    </div>
  );
}

// Main Component
export default function PlanClient({
  userName,
  initialWeekStart,
  initialPlanItems,
  recipeOptions,
}: Readonly<{
  userName: string;
  initialWeekStart: string;
  initialPlanItems: WeekPlanItem[];
  recipeOptions: RecipeOption[];
}>) {
  const today = new Date();
  const [isPending, startTransition] = useTransition();
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    getWeekStart(new Date(`${initialWeekStart}T00:00:00`))
  );
  const [weekPlanItems, setWeekPlanItems] = useState<WeekPlanItem[]>(
    initialPlanItems
  );
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerDayIndex, setPickerDayIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const recipeOptionsById = useMemo(
    () => new Map(recipeOptions.map((recipe) => [recipe.id, recipe])),
    [recipeOptions]
  );
  const weekDays = getWeekDays(currentWeekStart);
  const weekStartKey = formatDateKey(currentWeekStart);
  const weekPlan = useMemo(
    () => buildWeekPlan(weekDays, weekPlanItems, recipeOptionsById),
    [weekDays, weekPlanItems, recipeOptionsById]
  );

  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return recipeOptions;
    return recipeOptions.filter((recipe) => {
      const inName = recipe.name.toLowerCase().includes(term);
      const inIngredients = recipe.ingredientsText
        ? recipe.ingredientsText.toLowerCase().includes(term)
        : false;
      return inName || inIngredients;
    });
  }, [recipeOptions, searchTerm]);

  const loadWeekPlan = async (weekKey: string) => {
    const plan = await getWeekPlan(weekKey);
    setWeekPlanItems(plan.items);
  };

  const navigateWeek = (direction: number) => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(currentWeekStart.getDate() + direction * 7);
    setCurrentWeekStart(newStart);
    startTransition(() => {
      void loadWeekPlan(formatDateKey(newStart));
    });
  };

  const handleToggleComplete = (index: number) => {
    const entry = weekPlanItems.find((item) => item.dayIndex === index);
    if (!entry) return;
    const nextValue = !entry.isCompleted;

    setWeekPlanItems((prev) =>
      prev.map((item) =>
        item.dayIndex === index ? { ...item, isCompleted: nextValue } : item
      )
    );

    startTransition(() => {
      void togglePlannedMeal(weekStartKey, index, nextValue);
    });
  };

  const handleAddMeal = (index: number) => {
    setPickerDayIndex(index);
    setIsPickerOpen(true);
  };

  const handleSelectRecipe = (recipe: RecipeOption) => {
    if (pickerDayIndex == null) return;

    const dayIndex = pickerDayIndex;
    setIsPickerOpen(false);
    setPickerDayIndex(null);
    setSearchTerm("");

    setWeekPlanItems((prev) => {
      const next = prev.filter((item) => item.dayIndex !== dayIndex);
      next.push({
        dayIndex,
        recipeId: recipe.id,
        name: recipe.name,
        type: recipe.type,
        calories: null,
        isCompleted: false,
      });
      return next;
    });

    startTransition(() => {
      void setPlannedRecipe(weekStartKey, dayIndex, recipe.id);
    });
  };

  const handleClearMeal = (index: number) => {
    setWeekPlanItems((prev) => prev.filter((item) => item.dayIndex !== index));
    startTransition(() => {
      void clearPlannedMeal(weekStartKey, index);
    });
  };

  const weekLabel = `${weekDays[0].getDate()} - ${weekDays[6].getDate()} de ${MONTHS[weekDays[0].getMonth()]}`;

  return (
    <DashboardShell userName={userName} title="Plan Semanal" subtitle="Organiza tus almuerzos de la semana">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigateWeek(-1)}
            disabled={isPending}
            className="p-2 hover:bg-accent-yellow/50 rounded-xl transition-colors disabled:opacity-60"
          >
            <ChevronLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="text-center">
            <h2 className="text-lg sm:text-xl font-bold text-foreground">{weekLabel}</h2>
            <p className="text-sm text-muted-foreground">{currentWeekStart.getFullYear()}</p>
          </div>
          <button
            onClick={() => navigateWeek(1)}
            disabled={isPending}
            className="p-2 hover:bg-accent-yellow/50 rounded-xl transition-colors disabled:opacity-60"
          >
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Weekly Summary */}
        <WeeklySummary weekPlan={weekPlan} />

        {/* Week Grid - Desktop */}
        <div className="hidden lg:grid grid-cols-7 gap-4">
          {weekPlan.map((dayPlan, index) => (
            <DayCard
              key={dayPlan.date.toISOString()}
              dayPlan={dayPlan}
              isToday={dayPlan.date.toDateString() === today.toDateString()}
              onToggleComplete={() => handleToggleComplete(index)}
              onAddMeal={() => handleAddMeal(index)}
              onClearMeal={() => handleClearMeal(index)}
            />
          ))}
        </div>

        {/* List View - Mobile/Tablet */}
        <div className="lg:hidden">
          <ListView
            weekPlan={weekPlan}
            today={today}
            onToggleComplete={handleToggleComplete}
            onAddMeal={handleAddMeal}
            onClearMeal={handleClearMeal}
          />
        </div>

        {isPickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-xl rounded-2xl border border-card-border bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-card-border px-4 py-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Selecciona una receta
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {pickerDayIndex != null
                      ? `Dia ${DAYS_OF_WEEK[pickerDayIndex]}`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsPickerOpen(false);
                    setPickerDayIndex(null);
                    setSearchTerm("");
                  }}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Cerrar
                </button>
              </div>
              <div className="p-4 space-y-3">
                <input
                  type="text"
                  placeholder="Buscar receta..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-11 w-full rounded-xl border border-card-border bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                  {filteredOptions.map((recipe) => (
                    <button
                      key={recipe.id}
                      onClick={() => handleSelectRecipe(recipe)}
                      className="w-full rounded-xl border border-card-border px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-foreground">
                            {recipe.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {recipe.typeLabel}
                          </p>
                        </div>
                        <span className="text-lg">
                          {TYPE_EMOJI[recipe.type]}
                        </span>
                      </div>
                    </button>
                  ))}
                  {filteredOptions.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No hay recetas que coincidan con la busqueda.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            disabled
            className="flex-1 py-4 bg-primary/70 text-white font-semibold rounded-2xl flex items-center justify-center gap-2 transition-colors btn-primary-glow cursor-not-allowed"
          >
            <Sparkles className="w-5 h-5" />
            Autocompletar semana (pronto)
          </button>
          {/* <button className="flex-1 py-4 border-2 border-primary text-primary font-semibold rounded-2xl flex items-center justify-center gap-2 hover:bg-primary-light transition-colors">
            <ShoppingCart className="w-5 h-5" />
            Generar lista de compras
          </button> */}
        </div>
      </div>
    </DashboardShell>
  );
}

import { useState, useMemo } from 'react';
import { Plus, ChevronRight, ChevronLeft, Droplets, Utensils } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import { useTodayMeals, useTodayWater, useAddWater, useNutritionRealtimeInvalidation, nutritionKeys } from '@/hooks/queries/useNutritionQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import AddMealModal from '@/components/nutrition/AddMealModal';
import MealDetailSheet from '@/components/nutrition/MealDetailSheet';
import NutritionHistorySheet from '@/components/nutrition/NutritionHistorySheet';
import { getMealIcon, getMealColorClasses, getMealTextColor } from '@/utils/mealColors';

const MEAL_TYPES = [
  { type: 'breakfast', name: 'Petit-déjeuner', defaultTime: '08:00' },
  { type: 'morning_snack', name: 'Collation', defaultTime: '10:30' },
  { type: 'lunch', name: 'Déjeuner', defaultTime: '12:30' },
  { type: 'afternoon_snack', name: 'Goûter', defaultTime: '16:00' },
  { type: 'dinner', name: 'Dîner', defaultTime: '19:30' },
  { type: 'dessert', name: 'Dessert', defaultTime: '20:30' },
];

const WATER_BUTTONS = [
  { label: '+150ml', ml: 150 },
  { label: '+250ml', ml: 250 },
  { label: '+500ml', ml: 500 },
];

const NutritionPage = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const goals = useNutritionGoals(profile);

  const today = new Date().toISOString().split('T')[0];
  const { data: nutritionLogs = [], isLoading: logsLoading } = useTodayMeals(user?.id, today);
  const { data: waterMl = 0, isLoading: waterLoading } = useTodayWater(user?.id, today);
  const addWater = useAddWater(user?.id, today);
  useNutritionRealtimeInvalidation(user?.id);

  const isLoading = logsLoading || waterLoading;

  const [addMealModal, setAddMealModal] = useState<{ isOpen: boolean; mealType: string; mealName: string }>({
    isOpen: false,
    mealType: '',
    mealName: '',
  });
  const [mealDetail, setMealDetail] = useState<{ isOpen: boolean; mealName: string; logs: typeof nutritionLogs }>({
    isOpen: false,
    mealName: '',
    logs: [],
  });
  const [historyOpen, setHistoryOpen] = useState(false);

  const consumed = useMemo(() =>
    nutritionLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + (log.calories || 0),
        protein: acc.protein + (log.protein || 0),
        carbs: acc.carbs + (log.carbs || 0),
        fat: acc.fat + (log.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    ),
    [nutritionLogs]
  );

  const handleMealAdded = () => {
    queryClient.invalidateQueries({ queryKey: nutritionKeys.all });
  };

  // Group logs by meal type
  const mealsByType = useMemo(() =>
    MEAL_TYPES.map(mealType => {
      const logs = nutritionLogs.filter((log) => {
        if (log.meal_type === mealType.type) return true;
        if (log.meal_type !== 'snack') return false;
        const hour = new Date(log.logged_at).getHours();
        return mealType.type === (hour >= 14 ? 'afternoon_snack' : 'morning_snack');
      });
      const totalCalories = logs.reduce((sum, log) => sum + (log.calories || 0), 0);
      const description = logs.map(log => log.food_name).join(', ');
      const actualTime = logs.length > 0
        ? new Date(logs[0].logged_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : mealType.defaultTime;

      return { ...mealType, logs, totalCalories, description: description || null, displayTime: actualTime };
    }),
    [nutritionLogs]
  );

  const caloriesPercentage = goals.calories > 0
    ? (consumed.calories / goals.calories) * 100
    : 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (Math.min(caloriesPercentage, 100) / 100) * circumference;
  const waterLiters = waterMl / 1000;
  const glasses = Math.round(waterMl / 250);

  if (isLoading) {
    return (
      <div className="safe-top px-4 pb-4 pt-2">
        <div className="mb-6">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl mb-4" />
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="safe-top px-4 pb-24 pt-2">
      {/* Header with back button */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nutrition</h1>
          <p className="text-sm text-muted-foreground">Suivi alimentaire du jour</p>
        </div>
      </div>

      {/* Calories ring */}
      <div className="mb-4 card-premium p-4">
        <p className="mb-2 text-xs text-muted-foreground">Calories consommées</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold text-foreground">
              {consumed.calories}
              <span className="text-lg font-normal text-muted-foreground">
                / {goals.calories}
              </span>
            </p>
          </div>
          <div className="relative">
            <svg width="90" height="90" className="-rotate-90">
              <defs>
                <linearGradient id="caloriesGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--primary-glow))" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              <circle cx="45" cy="45" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="45" cy="45" r="40" fill="none"
                stroke="url(#caloriesGradient)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                filter="url(#glow)" className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <Utensils className="h-6 w-6 text-primary" />
                <div className="absolute inset-0 bg-primary/30 blur-sm rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Macros */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        {[
          { name: 'Protéines', consumed: consumed.protein, goal: goals.protein, gradient: 'from-primary to-primary-glow' },
          { name: 'Glucides', consumed: consumed.carbs, goal: goals.carbs, gradient: 'from-primary to-primary-glow' },
          { name: 'Lipides', consumed: consumed.fat, goal: goals.fat, gradient: 'from-energy to-energy/70' },
        ].map((macro) => (
          <div key={macro.name} className="card-premium p-3 group">
            <p className="mb-1 text-xs text-muted-foreground">{macro.name}</p>
            <p className="mb-2 text-lg font-bold text-foreground">
              {Math.round(macro.consumed)}
              <span className="text-xs font-normal text-muted-foreground">
                /{macro.goal}g
              </span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${macro.gradient} transition-all`}
                style={{ width: `${Math.min((macro.consumed / macro.goal) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Hydration */}
      <div className="mb-4 card-premium p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-water/10">
              <Droplets className="h-5 w-5 text-water" />
              <div className="absolute inset-0 rounded-full bg-water/20 blur-sm -z-10" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hydratation</p>
              <p className="text-xl font-bold text-foreground">
                {waterLiters.toFixed(1)}L
                <span className="text-sm font-normal text-muted-foreground">
                  {' '}/ {goals.hydrationLiters}L
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{glasses} verre{glasses !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {WATER_BUTTONS.map(btn => (
              <button
                key={btn.ml}
                onClick={() => addWater.mutate(btn.ml)}
                disabled={addWater.isPending}
                className="flex items-center justify-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-primary/10 hover:border-primary hover:shadow-glow-sm active:scale-95 disabled:opacity-50"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Meals */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Repas du jour</p>
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-glow transition-colors"
          >
            Historique
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {mealsByType.map((meal) => {
            const Icon = getMealIcon(meal.type);
            const isEmpty = !meal.description;
            const iconColor = getMealTextColor(meal.type);
            const bgClass = isEmpty ? 'bg-muted' : getMealColorClasses(meal.type).split(' ')[1];

            return (
              <div
                key={meal.type}
                onClick={() => {
                  if (!isEmpty) {
                    setMealDetail({ isOpen: true, mealName: meal.name, logs: meal.logs });
                  }
                }}
                className={`card-premium p-4 ${isEmpty ? 'border-dashed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`relative flex h-10 w-10 items-center justify-center rounded-full ${isEmpty ? 'bg-muted' : bgClass}`}>
                      <Icon className={`h-5 w-5 ${isEmpty ? 'text-muted-foreground' : iconColor}`} />
                      {!isEmpty && <div className={`absolute inset-0 rounded-full ${bgClass} blur-sm -z-10`} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{meal.name}</p>
                        <span className="text-xs text-muted-foreground">{meal.displayTime}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {meal.description || 'Aucun repas enregistré'}
                      </p>
                    </div>
                  </div>
                  {isEmpty ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddMealModal({ isOpen: true, mealType: meal.type, mealName: meal.name });
                      }}
                      className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-all hover:bg-primary/10 hover:border-primary hover:shadow-glow-sm active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                      Ajouter
                    </button>
                  ) : (
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Meal Modal */}
      <AddMealModal
        isOpen={addMealModal.isOpen}
        onClose={() => setAddMealModal({ isOpen: false, mealType: '', mealName: '' })}
        onMealAdded={handleMealAdded}
        userId={user?.id || null}
        mealType={addMealModal.mealType}
        mealName={addMealModal.mealName}
      />

      {/* Meal Detail Sheet */}
      <MealDetailSheet
        isOpen={mealDetail.isOpen}
        onClose={() => setMealDetail({ isOpen: false, mealName: '', logs: [] })}
        mealName={mealDetail.mealName}
        logs={mealDetail.logs}
        onChanged={handleMealAdded}
      />

      {/* Nutrition History Sheet */}
      <NutritionHistorySheet
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        calorieGoal={goals.calories}
        proteinGoal={goals.protein}
        carbsGoal={goals.carbs}
        fatGoal={goals.fat}
        waterGoal={goals.hydrationLiters}
      />
    </div>
  );
};

export default NutritionPage;

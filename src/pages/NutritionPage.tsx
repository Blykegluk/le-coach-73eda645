import { Plus, ChevronRight, Droplets, Coffee, UtensilsCrossed, Moon, Apple, Utensils, Cake } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Skeleton } from '@/components/ui/skeleton';
import AddMealModal from '@/components/nutrition/AddMealModal';
import MealDetailSheet from '@/components/nutrition/MealDetailSheet';

interface NutritionLog {
  id: string;
  meal_type: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_at: string;
}

interface NutritionSummary {
  calories: { consumed: number; goal: number };
  protein: { consumed: number; goal: number };
  carbs: { consumed: number; goal: number };
  fat: { consumed: number; goal: number };
  hydration: { consumed: number; goal: number };
}

const MEAL_TYPES = [
  { type: 'breakfast', name: 'Petit-déjeuner', defaultTime: '08:00', icon: Coffee },
  { type: 'morning_snack', name: 'Collation', defaultTime: '10:30', icon: Apple },
  { type: 'lunch', name: 'Déjeuner', defaultTime: '12:30', icon: UtensilsCrossed },
  { type: 'afternoon_snack', name: 'Goûter', defaultTime: '16:00', icon: Apple },
  { type: 'dinner', name: 'Dîner', defaultTime: '19:30', icon: Moon },
  { type: 'dessert', name: 'Dessert', defaultTime: '20:30', icon: Cake },
];

// Map old 'snack' type to new types (for backward compatibility)
function mapMealType(type: string): string {
  if (type === 'snack') return 'morning_snack';
  return type;
}

// Calculate daily goals based on profile (simplified Harris-Benedict + activity multiplier)
function calculateDailyGoals(profile: { weight_kg?: number | null; height_cm?: number | null; birth_date?: string | null; gender?: string | null; activity_level?: string | null; goal?: string | null } | null): NutritionSummary {
  // Default goals if no profile
  const defaults = {
    calories: { consumed: 0, goal: 2000 },
    protein: { consumed: 0, goal: 100 },
    carbs: { consumed: 0, goal: 250 },
    fat: { consumed: 0, goal: 65 },
    hydration: { consumed: 0, goal: 2.5 },
  };

  if (!profile?.weight_kg || !profile?.height_cm) return defaults;

  // Simple BMR calculation
  const weight = profile.weight_kg;
  const height = profile.height_cm;
  const age = profile.birth_date 
    ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 30;
  
  let bmr: number;
  if (profile.gender === 'male') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }

  // Activity multiplier
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
    athlete: 1.9,
  };
  const multiplier = activityMultipliers[profile.activity_level || 'moderate'] || 1.55;
  
  let tdee = Math.round(bmr * multiplier);

  // Adjust for goal
  if (profile.goal === 'weight_loss' || profile.goal === 'fat_loss') {
    tdee = Math.round(tdee * 0.85); // 15% deficit
  } else if (profile.goal === 'muscle_gain') {
    tdee = Math.round(tdee * 1.1); // 10% surplus
  }

  // Macro split (protein: 2g/kg, rest balanced)
  const proteinGoal = Math.round(weight * 2);
  const proteinCals = proteinGoal * 4;
  const fatGoal = Math.round((tdee * 0.25) / 9);
  const fatCals = fatGoal * 9;
  const carbGoal = Math.round((tdee - proteinCals - fatCals) / 4);

  return {
    calories: { consumed: 0, goal: tdee },
    protein: { consumed: 0, goal: proteinGoal },
    carbs: { consumed: 0, goal: carbGoal },
    fat: { consumed: 0, goal: fatGoal },
    hydration: { consumed: 0, goal: Math.round(weight * 0.033 * 10) / 10 },
  };
}

const NutritionPage = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [waterMl, setWaterMl] = useState(0);
  const [addMealModal, setAddMealModal] = useState<{ isOpen: boolean; mealType: string; mealName: string }>({
    isOpen: false,
    mealType: '',
    mealName: '',
  });
  const [mealDetail, setMealDetail] = useState<{ isOpen: boolean; mealName: string; logs: NutritionLog[] }>({
    isOpen: false,
    mealName: '',
    logs: [],
  });

  const baseGoals = calculateDailyGoals(profile);

  const fetchTodayNutrition = async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    
    // Fetch nutrition logs
    const { data: logs } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', `${today}T00:00:00`)
      .lte('logged_at', `${today}T23:59:59`)
      .order('logged_at', { ascending: true });

    // Fetch water from daily_metrics
    const { data: metrics } = await supabase
      .from('daily_metrics')
      .select('water_ml')
      .eq('user_id', user.id)
      .eq('date', today)
      .maybeSingle();

    setNutritionLogs(logs || []);
    setWaterMl(metrics?.water_ml || 0);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchTodayNutrition();
  }, [user]);

  // Calculate consumed from logs
  const consumed = nutritionLogs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fat: acc.fat + (log.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const nutritionData: NutritionSummary = {
    calories: { consumed: consumed.calories, goal: baseGoals.calories.goal },
    protein: { consumed: consumed.protein, goal: baseGoals.protein.goal },
    carbs: { consumed: consumed.carbs, goal: baseGoals.carbs.goal },
    fat: { consumed: consumed.fat, goal: baseGoals.fat.goal },
    hydration: { consumed: waterMl / 1000, goal: baseGoals.hydration.goal },
  };

  const addHydration = async (liters: number) => {
    if (!user) return;
    
    const today = new Date().toISOString().split('T')[0];
    const newWaterMl = waterMl + Math.round(liters * 1000);
    
    const { error } = await supabase
      .from('daily_metrics')
      .upsert({
        user_id: user.id,
        date: today,
        water_ml: newWaterMl,
      }, { onConflict: 'user_id,date' });

    if (!error) {
      setWaterMl(newWaterMl);
    }
  };

  // Group logs by meal type and get actual logged time
  const mealsByType = MEAL_TYPES.map(mealType => {
    // Backward compatibility for old 'snack' type:
    // - before ~14h => morning_snack
    // - after ~14h  => afternoon_snack
    const logs = nutritionLogs.filter((log) => {
      if (log.meal_type === mealType.type) return true;
      if (log.meal_type !== 'snack') return false;
      const hour = new Date(log.logged_at).getHours();
      const isAfternoon = hour >= 14;
      return mealType.type === (isAfternoon ? 'afternoon_snack' : 'morning_snack');
    });
    const totalCalories = logs.reduce((sum, log) => sum + (log.calories || 0), 0);
    const description = logs.map(log => log.food_name).join(', ');
    
    // Get actual time from first log, or use default
    const actualTime = logs.length > 0 
      ? new Date(logs[0].logged_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : mealType.defaultTime;
    
    return {
      ...mealType,
      logs,
      totalCalories,
      description: description || null,
      displayTime: actualTime,
    };
  });

  const caloriesPercentage = nutritionData.calories.goal > 0 
    ? (nutritionData.calories.consumed / nutritionData.calories.goal) * 100 
    : 0;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (Math.min(caloriesPercentage, 100) / 100) * circumference;

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
    <div className="safe-top px-4 pb-4 pt-2">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Nutrition</h1>
        <p className="text-sm text-muted-foreground">Suivi alimentaire du jour</p>
      </div>

      {/* Calories ring */}
      <div className="mb-4 card-premium p-4 animate-slide-up">
        <p className="mb-2 text-xs text-muted-foreground">Calories consommées</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-4xl font-bold text-foreground">
              {nutritionData.calories.consumed}
              <span className="text-lg font-normal text-muted-foreground">
                / {nutritionData.calories.goal}
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
              <circle
                cx="45"
                cy="45"
                r="40"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="8"
              />
              <circle
                cx="45"
                cy="45"
                r="40"
                fill="none"
                stroke="url(#caloriesGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                filter="url(#glow)"
                className="transition-all duration-500"
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
      <div className="mb-4 grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        {[
          { name: 'Protéines', value: nutritionData.protein, gradient: 'from-primary to-primary-glow' },
          { name: 'Glucides', value: nutritionData.carbs, gradient: 'from-primary to-primary-glow' },
          { name: 'Lipides', value: nutritionData.fat, gradient: 'from-energy to-energy/70' },
        ].map((macro) => (
          <div key={macro.name} className="card-premium p-3 group">
            <p className="mb-1 text-xs text-muted-foreground">{macro.name}</p>
            <p className="mb-2 text-lg font-bold text-foreground">
              {Math.round(macro.value.consumed)}
              <span className="text-xs font-normal text-muted-foreground">
                /{macro.value.goal}g
              </span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${macro.gradient} transition-all`}
                style={{ width: `${Math.min((macro.value.consumed / macro.value.goal) * 100, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Hydration */}
      <div className="mb-4 card-premium p-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-water/10">
              <Droplets className="h-5 w-5 text-water" />
              <div className="absolute inset-0 rounded-full bg-water/20 blur-sm -z-10" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hydratation</p>
              <p className="text-xl font-bold text-foreground">
                {nutritionData.hydration.consumed.toFixed(1)}L
                <span className="text-sm font-normal text-muted-foreground">
                  / {nutritionData.hydration.goal}L
                </span>
              </p>
            </div>
          </div>
          <button 
            onClick={() => addHydration(0.25)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-all hover:bg-primary/10 hover:border-primary hover:shadow-glow-sm active:scale-95"
          >
            <Plus className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Meals */}
      <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Repas du jour</p>
          <button className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-glow transition-colors">
            Historique
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2">
          {mealsByType.map((meal, index) => {
            const Icon = meal.icon;
            const isEmpty = !meal.description;
            
            return (
              <div
                key={meal.type}
                onClick={() => {
                  if (!isEmpty) {
                    setMealDetail({ isOpen: true, mealName: meal.name, logs: meal.logs });
                  }
                }}
                className={`card-premium p-4 animate-slide-up ${
                  isEmpty ? 'border-dashed' : 'cursor-pointer'
                }`}
                style={{ animationDelay: `${0.3 + index * 0.05}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`relative flex h-10 w-10 items-center justify-center rounded-full ${
                      isEmpty ? 'bg-muted' : 'bg-primary/10'
                    }`}>
                      <Icon className={`h-5 w-5 ${isEmpty ? 'text-muted-foreground' : 'text-primary'}`} />
                      {!isEmpty && <div className="absolute inset-0 rounded-full bg-primary/20 blur-sm -z-10" />}
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
        onMealAdded={fetchTodayNutrition}
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
        onChanged={fetchTodayNutrition}
      />
    </div>
  );
};

export default NutritionPage;

import { useState } from 'react';
import { Utensils } from 'lucide-react';
import { useNutritionHistory } from '@/hooks/queries/useProgressQueries';
import { useProfile } from '@/hooks/useProfile';
import ProgressChart from '@/components/progress/ProgressChart';

interface NutritionProgressSectionProps {
  userId: string | undefined;
}

const NutritionProgressSection = ({ userId }: NutritionProgressSectionProps) => {
  const [period, setPeriod] = useState<7 | 30>(30);
  const { data: nutritionData, isLoading } = useNutritionHistory(userId, period);
  const { profile } = useProfile();

  const targetCalories = profile?.target_calories ?? undefined;
  const targetProtein = profile?.weight_kg ? Math.round(profile.weight_kg * 2) : undefined;

  const caloriesChartData = (nutritionData ?? []).map(d => ({
    date: d.date,
    value: d.calories,
  }));

  const proteinChartData = (nutritionData ?? []).map(d => ({
    date: d.date,
    value: d.protein,
  }));

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Nutrition</h2>
        </div>

        {/* Period toggle */}
        <div className="flex rounded-lg bg-muted p-0.5">
          <button
            onClick={() => setPeriod(7)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              period === 7
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            7j
          </button>
          <button
            onClick={() => setPeriod(30)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              period === 30
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            30j
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="h-4 w-20 rounded bg-muted animate-pulse mb-3" />
            <div className="h-36 rounded bg-muted animate-pulse" />
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!nutritionData || nutritionData.length === 0) && (
        <div className="rounded-xl border border-border bg-card/50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Utensils className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Commence a logger tes repas pour voir ton evolution nutritionnelle
          </p>
        </div>
      )}

      {/* Charts */}
      {!isLoading && nutritionData && nutritionData.length > 0 && (
        <div className="space-y-4">
          {/* Calories chart */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Calories</p>
            <ProgressChart
              data={caloriesChartData}
              label="Calories"
              unit="kcal"
              color="#f59e0b"
              targetValue={targetCalories}
            />
          </div>

          {/* Protein chart */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Proteines</p>
            <ProgressChart
              data={proteinChartData}
              label="Proteines"
              unit="g"
              color="#22c55e"
              targetValue={targetProtein}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionProgressSection;

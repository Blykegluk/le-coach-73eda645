import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import {
  useTodayMetrics,
  useTodayNutrition,
  useHealthStats,
  useHomeRealtimeInvalidation,
} from '@/hooks/queries/useHomeQueries';
import { Skeleton } from '@/components/ui/skeleton';
import AppHeader from '@/components/layout/AppHeader';
import StatHistorySheet from '@/components/home/StatHistorySheet';

import HealthStatsCard from '@/components/home/HealthStatsCard';
import CircularProgressRings from '@/components/home/CircularProgressRings';
import NextWorkoutCard from '@/components/training/NextWorkoutCard';
import EquipmentSection from '@/components/training/EquipmentSection';

const HomePage = () => {
  const { user } = useAuth();
  const { profile } = useProfile();

  // Local UI state
  const [statHistoryKey, setStatHistoryKey] = useState<string | null>(null);

  // TanStack Query hooks — all data fetching
  const { data: metrics, isLoading: metricsLoading } = useTodayMetrics(user?.id);
  const { data: todayNutrition } = useTodayNutrition(user?.id);
  const { data: healthStats } = useHealthStats(user?.id);

  // Realtime invalidation — subscribes once, invalidates queries on DB changes
  useHomeRealtimeInvalidation(user?.id);

  // Nutrition goals (derived from profile)
  const nutritionGoals = useNutritionGoals(profile);
  const caloriesGoal = nutritionGoals.calories;
  const proteinGoal = nutritionGoals.protein;
  const carbsGoal = nutritionGoals.carbs;

  const caloriesConsumed = todayNutrition?.calories ?? 0;
  const proteinConsumed = todayNutrition?.protein ?? 0;
  const carbsConsumed = todayNutrition?.carbs ?? 0;

  // Stat history sheet config
  const statHistoryConfig: Record<string, { title: string; unit: string; metricKey: string }> = {
    sleep: { title: 'Sommeil', unit: 'h', metricKey: 'sleep_hours' },
    heartRate: { title: 'Rythme cardiaque', unit: 'bpm', metricKey: 'heart_rate_avg' },
    steps: { title: 'Pas', unit: '', metricKey: 'steps' },
    activeMinutes: { title: 'Minutes actives', unit: 'min', metricKey: 'active_minutes' },
    calories: { title: 'Calories', unit: 'kcal', metricKey: 'calories' },
    protein: { title: 'Protéines', unit: 'g', metricKey: 'protein' },
    carbs: { title: 'Glucides', unit: 'g', metricKey: 'carbs' },
  };

  const handleStatClick = (key: string) => setStatHistoryKey(key);
  const handleRingClick = (ring: 'calories' | 'protein' | 'carbs') => setStatHistoryKey(ring);

  if (metricsLoading) {
    return (
      <div className="safe-top px-4 pb-4 pt-2">
        <div className="mb-6">
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
        <Skeleton className="mb-4 h-32 w-full rounded-2xl" />
        <Skeleton className="mb-4 h-20 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="safe-top px-4 pb-24 md:pb-4 pt-2">
      {/* Header */}
      <AppHeader title="The Perfect Coach" />

      {/* Circular Progress Rings */}
      <CircularProgressRings
        caloriesConsumed={caloriesConsumed}
        caloriesGoal={caloriesGoal}
        proteinConsumed={proteinConsumed}
        proteinGoal={proteinGoal}
        carbsConsumed={carbsConsumed}
        carbsGoal={carbsGoal}
        onRingClick={handleRingClick}
      />

      {/* Health Stats Section */}
      <HealthStatsCard
        stats={healthStats ?? {
          sleepHours: null,
          steps: null,
          heartRateAvg: null,
          heartRateResting: null,
          activeMinutes: null,
          floorsClimbed: null,
        }}
        isLoading={false}
        targetSteps={profile?.target_steps ?? 10000}
        targetSleepHours={profile?.target_sleep_hours ?? 8}
        onStatClick={handleStatClick}
      />

      {/* Next Workout Card */}
      <div className="mb-4">
        <NextWorkoutCard />
      </div>

      {/* Equipment Section */}
      <EquipmentSection />

      {/* Stat History Sheet */}
      {statHistoryKey && statHistoryConfig[statHistoryKey] && (
        <StatHistorySheet
          isOpen={!!statHistoryKey}
          onClose={() => setStatHistoryKey(null)}
          metricKey={statHistoryConfig[statHistoryKey].metricKey}
          title={statHistoryConfig[statHistoryKey].title}
          unit={statHistoryConfig[statHistoryKey].unit}
          userId={user?.id}
        />
      )}
    </div>
  );
};

export default HomePage;

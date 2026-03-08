import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import {
  useTodayMetrics,
  useWeeklySessions,
  useCurrentWeight,
  useTodayNutrition,
  useHealthStats,
  usePreparedWorkout,
  useHomeRealtimeInvalidation,
} from '@/hooks/queries/useHomeQueries';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import GoalEditorModal from '@/components/profile/GoalEditorModal';

import HealthStatsCard from '@/components/home/HealthStatsCard';
import SmartActionCard from '@/components/home/SmartActionCard';
import CircularProgressRings from '@/components/home/CircularProgressRings';
import WorkoutPreviewSheet from '@/components/home/WorkoutPreviewSheet';
import { ActiveWorkoutSession } from '@/components/training/ActiveWorkoutSession';
import type { Workout } from '@/components/training/NextWorkoutCard';

interface OutletContextType {
  onOpenCoach?: () => void;
}

const WORKOUT_STORAGE_KEY = 'prepared_workout';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const outletContext = useOutletContext<OutletContextType>() || {};

  // Local UI state only
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isWorkoutPreviewOpen, setIsWorkoutPreviewOpen] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isRefreshingWorkout, setIsRefreshingWorkout] = useState(false);

  // TanStack Query hooks — all data fetching
  const { data: metrics, isLoading: metricsLoading } = useTodayMetrics(user?.id);
  const { data: weeklySessionsCompleted = 0 } = useWeeklySessions(user?.id);
  const { data: todayNutrition } = useTodayNutrition(user?.id);
  const { data: healthStats } = useHealthStats(user?.id);
  const { data: preparedWorkout } = usePreparedWorkout(user?.id);

  // Realtime invalidation — subscribes once, invalidates queries on DB changes
  useHomeRealtimeInvalidation(user?.id);

  // Nutrition goals (derived from profile)
  const nutritionGoals = useNutritionGoals(profile);
  const caloriesGoal = nutritionGoals.calories;
  const proteinGoal = nutritionGoals.protein;
  const waterGoal = profile?.target_water_ml ?? Math.round(nutritionGoals.hydrationLiters * 1000);

  const waterConsumed = metrics?.waterMl || 0;
  const caloriesConsumed = todayNutrition?.calories ?? 0;
  const proteinConsumed = todayNutrition?.protein ?? 0;
  const loggedMealTypes = todayNutrition?.loggedMealTypes ?? [];

  const weeklySessionsTotal = profile?.activity_level === 'very_active' ? 6
    : profile?.activity_level === 'active' ? 5
    : profile?.activity_level === 'moderate' ? 4
    : profile?.activity_level === 'light' ? 3
    : 2;

  const handleStartWorkout = () => {
    if (preparedWorkout) {
      setIsWorkoutPreviewOpen(false);
      setIsSessionActive(true);
    }
  };

  const handleOpenCoach = () => {
    outletContext.onOpenCoach?.();
  };

  const handlePreviewWorkout = () => {
    if (preparedWorkout) {
      setIsWorkoutPreviewOpen(true);
    }
  };

  const handleRefreshWorkout = async () => {
    if (!user) return;
    setIsRefreshingWorkout(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error: fnError } = await supabase.functions.invoke('next-workout', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      await supabase
        .from('user_context')
        .upsert({
          user_id: user.id,
          key: WORKOUT_STORAGE_KEY,
          value: JSON.stringify(data),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,key' });
    } catch (err) {
      console.error("Error refreshing workout:", err);
    } finally {
      setIsRefreshingWorkout(false);
    }
  };

  const handleSessionComplete = async () => {
    setIsSessionActive(false);
    if (user) {
      await supabase
        .from('user_context')
        .delete()
        .eq('user_id', user.id)
        .eq('key', WORKOUT_STORAGE_KEY);
      await handleRefreshWorkout();
    }
  };

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

  if (isSessionActive && preparedWorkout) {
    return (
      <div className="safe-top px-4 pb-24 md:pb-4 pt-2">
        <ActiveWorkoutSession
          workout={preparedWorkout}
          onClose={() => setIsSessionActive(false)}
          onComplete={handleSessionComplete}
        />
      </div>
    );
  }

  return (
    <div className="safe-top px-4 pb-24 md:pb-4 pt-2">
      {/* Header */}
      <div className="mb-4 text-center">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-gradient-primary">The Perfect</span>{' '}
          <span className="text-foreground">Coach</span>
        </h1>
      </div>

      {/* Smart Action Card - Hero Section */}
      <SmartActionCard
        preparedWorkout={preparedWorkout ? {
          name: preparedWorkout.workout_name,
          targetMuscles: preparedWorkout.target_muscles,
        } : null}
        loggedMealTypes={loggedMealTypes}
        onStartWorkout={handleStartWorkout}
        onOpenCoach={handleOpenCoach}
        onPreviewWorkout={handlePreviewWorkout}
      />

      {/* Circular Progress Rings */}
      <CircularProgressRings
        caloriesConsumed={caloriesConsumed}
        caloriesGoal={caloriesGoal}
        proteinConsumed={proteinConsumed}
        proteinGoal={proteinGoal}
        waterConsumed={waterConsumed}
        waterGoal={waterGoal}
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
      />

      {/* Goal Editor Modal */}
      <GoalEditorModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        currentGoal={profile?.goal}
        currentTargetWeight={profile?.target_weight_kg}
      />

      {/* Workout Preview Sheet */}
      <WorkoutPreviewSheet
        isOpen={isWorkoutPreviewOpen}
        onClose={() => setIsWorkoutPreviewOpen(false)}
        workout={preparedWorkout ?? null}
        onStartWorkout={handleStartWorkout}
        onRefresh={handleRefreshWorkout}
        isRefreshing={isRefreshingWorkout}
      />
    </div>
  );
};

export default HomePage;

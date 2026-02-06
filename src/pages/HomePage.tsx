import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { ChevronRight, Target, Plus, Dumbbell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { healthProvider } from '@/providers/health';
import { supabase } from '@/integrations/supabase/client';
import type { HealthMetrics } from '@/providers/health';
import { Skeleton } from '@/components/ui/skeleton';
import GoalEditorModal from '@/components/profile/GoalEditorModal';
import GoalProgressCard from '@/components/home/GoalProgressCard';
import DailyTipsCard from '@/components/home/DailyTipsCard';
import HealthStatsCard from '@/components/home/HealthStatsCard';
import SmartActionCard from '@/components/home/SmartActionCard';
import CircularProgressRings from '@/components/home/CircularProgressRings';
import ContextualAlertChips from '@/components/home/ContextualAlertChips';
import WorkoutPreviewSheet from '@/components/home/WorkoutPreviewSheet';
import { ActiveWorkoutSession } from '@/components/training/ActiveWorkoutSession';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import { Workout } from '@/components/training/NextWorkoutCard';

interface OutletContextType {
  onOpenCoach?: () => void;
}

const WORKOUT_STORAGE_KEY = 'prepared_workout';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const outletContext = useOutletContext<OutletContextType>() || {};
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [weeklySessionsCompleted, setWeeklySessionsCompleted] = useState(0);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [currentBodyFat, setCurrentBodyFat] = useState<number | null>(null);
  const [proteinConsumed, setProteinConsumed] = useState<number>(0);
  const [caloriesConsumed, setCaloriesConsumed] = useState<number>(0);
  const [preparedWorkout, setPreparedWorkout] = useState<Workout | null>(null);
  const [isWorkoutPreviewOpen, setIsWorkoutPreviewOpen] = useState(false);
  const [healthStats, setHealthStats] = useState({
    sleepHours: null as number | null,
    steps: null as number | null,
    heartRateAvg: null as number | null,
    heartRateResting: null as number | null,
    activeMinutes: null as number | null,
    floorsClimbed: null as number | null,
  });

  // Use shared nutrition goals calculation (same as NutritionPage)
  const nutritionGoals = useNutritionGoals(profile);
  const caloriesGoal = nutritionGoals.calories;
  const proteinGoal = nutritionGoals.protein;
  const waterGoal = profile?.target_water_ml ?? Math.round(nutritionGoals.hydrationLiters * 1000);

  const fetchMetrics = useCallback(async () => {
    if (!user) return;
    healthProvider.setUserId(user.id);
    const todayMetrics = await healthProvider.getTodayMetrics();
    setMetrics(todayMetrics);
    setIsLoading(false);
  }, [user]);

  // Fetch prepared workout from user_context
  const fetchPreparedWorkout = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_context')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', WORKOUT_STORAGE_KEY)
      .maybeSingle();

    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value);
        setPreparedWorkout(parsed as Workout);
      } catch {
        console.error('Error parsing prepared workout');
      }
    }
  }, [user]);

  // Fetch current weight and body fat from latest data
  const fetchCurrentMetrics = useCallback(async () => {
    if (!user) return;

    const { data: dailyData } = await supabase
      .from('daily_metrics')
      .select('weight, body_fat_pct')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (dailyData?.weight) {
      setCurrentWeight(dailyData.weight);
    }
    if (dailyData?.body_fat_pct) {
      setCurrentBodyFat(dailyData.body_fat_pct);
    }

    const { data: bodyData } = await supabase
      .from('body_composition')
      .select('weight_kg, body_fat_pct')
      .eq('user_id', user.id)
      .order('measured_at', { ascending: false })
      .limit(1)
      .single();

    if (bodyData) {
      if (!dailyData?.weight && bodyData.weight_kg) {
        setCurrentWeight(bodyData.weight_kg);
      }
      if (!dailyData?.body_fat_pct && bodyData.body_fat_pct) {
        setCurrentBodyFat(bodyData.body_fat_pct);
      }
    }
  }, [user]);

  // Fetch today's nutrition intake
  const fetchNutritionIntake = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const startOfDay = `${today}T00:00:00`;
    const endOfDay = `${today}T23:59:59`;

    const { data } = await supabase
      .from('nutrition_logs')
      .select('calories, protein')
      .eq('user_id', user.id)
      .gte('logged_at', startOfDay)
      .lte('logged_at', endOfDay);

    if (data) {
      const totalCalories = data.reduce((sum, log) => sum + (log.calories || 0), 0);
      const totalProtein = data.reduce((sum, log) => sum + (log.protein || 0), 0);
      setCaloriesConsumed(Math.round(totalCalories));
      setProteinConsumed(Math.round(totalProtein));
    }
  }, [user]);

  // Fetch weekly sessions count
  const fetchWeeklySessions = useCallback(async () => {
    if (!user) return;

    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('performed_at', startOfWeek.toISOString());

    if (!error && count !== null) {
      setWeeklySessionsCompleted(count);
    }
  }, [user]);

  // Fetch health stats
  const fetchHealthStats = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('daily_metrics')
      .select('sleep_hours, steps, heart_rate_avg, heart_rate_resting, active_minutes, floors_climbed')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (data) {
      setHealthStats({
        sleepHours: data.sleep_hours,
        steps: data.steps,
        heartRateAvg: data.heart_rate_avg,
        heartRateResting: data.heart_rate_resting,
        activeMinutes: data.active_minutes,
        floorsClimbed: data.floors_climbed,
      });
    }
  }, [user]);

  useEffect(() => {
    fetchMetrics();
    fetchWeeklySessions();
    fetchCurrentMetrics();
    fetchNutritionIntake();
    fetchHealthStats();
    fetchPreparedWorkout();

    if (user) {
      healthProvider.setUserId(user.id);
      const unsubscribe = healthProvider.subscribeToMetrics((newMetrics) => {
        setMetrics(newMetrics);
      });

      const activitiesChannel = supabase
        .channel('homepage_activities')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'activities',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          fetchWeeklySessions();
        })
        .subscribe();

      const nutritionChannel = supabase
        .channel('homepage_nutrition')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'nutrition_logs',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          fetchNutritionIntake();
        })
        .subscribe();

      const metricsChannel = supabase
        .channel('homepage_daily_metrics')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'daily_metrics',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          fetchHealthStats();
          fetchMetrics();
        })
        .subscribe();

      const contextChannel = supabase
        .channel('homepage_context')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'user_context',
          filter: `user_id=eq.${user.id}`,
        }, () => {
          fetchPreparedWorkout();
        })
        .subscribe();

      return () => {
        unsubscribe();
        supabase.removeChannel(activitiesChannel);
        supabase.removeChannel(nutritionChannel);
        supabase.removeChannel(metricsChannel);
        supabase.removeChannel(contextChannel);
      };
    }
  }, [user, fetchMetrics, fetchWeeklySessions, fetchCurrentMetrics, fetchNutritionIntake, fetchHealthStats, fetchPreparedWorkout]);

  const firstName = profile?.first_name || user?.email?.split('@')[0] || 'Athlète';
  const waterConsumed = metrics?.waterMl || 0;
  const caloriesPercentage = (caloriesConsumed / caloriesGoal) * 100;

  const weeklySessionsTotal = profile?.activity_level === 'very_active' ? 6 
    : profile?.activity_level === 'active' ? 5
    : profile?.activity_level === 'moderate' ? 4
    : profile?.activity_level === 'light' ? 3
    : 2;

  const handleStartWorkout = () => {
    setIsWorkoutPreviewOpen(false);
    navigate('/training');
  };

  const handleOpenCoach = () => {
    outletContext.onOpenCoach?.();
  };

  const handlePreviewWorkout = () => {
    if (preparedWorkout) {
      setIsWorkoutPreviewOpen(true);
    }
  };

  if (isLoading) {
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
      <div className="mb-4">
        <span className="text-sm text-muted-foreground">Bonjour 👋</span>
        <h1 className="text-2xl font-bold text-foreground">
          {firstName}, <span className="text-gradient-primary">prêt à transpirer ?</span>
        </h1>
      </div>

      {/* Contextual Alert Chips */}
      <ContextualAlertChips
        weeklySessionsCompleted={weeklySessionsCompleted}
        sleepHours={healthStats.sleepHours}
        caloriesPercentage={caloriesPercentage}
      />

      {/* Smart Action Card - Hero Section */}
      <SmartActionCard
        preparedWorkout={preparedWorkout ? {
          name: preparedWorkout.workout_name,
          targetMuscles: preparedWorkout.target_muscles,
        } : null}
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

      {/* Goal Progress Card */}
      <div className="mb-4">
        <GoalProgressCard 
          profile={profile} 
          currentWeight={currentWeight}
          currentBodyFat={currentBodyFat}
        />
      </div>

      {/* Daily Tips */}
      <div className="mb-4">
        <DailyTipsCard />
      </div>


      {/* Quick actions */}
      <div className="mb-4">
        <p className="mb-3 text-sm font-medium text-foreground">Accès rapide</p>
        <div className="space-y-2">
          <button
            onClick={() => navigate('/journal')}
            className="flex w-full items-center justify-between card-premium p-4"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Ajouter au journal</p>
                <p className="text-sm text-muted-foreground">Repas, séances, hydratation</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => navigate('/journal')}
            className="flex w-full items-center justify-between card-premium p-4"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Voir le journal</p>
                <p className="text-sm text-muted-foreground">Historique unifié</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="flex w-full items-center justify-between card-premium p-4"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">
                  {profile?.goal ? 'Ajuster l\'objectif' : 'Définir un objectif'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {profile?.goal ? 'Modifie tes objectifs fitness' : 'Fixe tes objectifs fitness'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Health Stats Section */}
      <HealthStatsCard 
        stats={healthStats}
        isLoading={isLoading}
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
        workout={preparedWorkout}
        onStartWorkout={handleStartWorkout}
      />
    </div>
  );
};

export default HomePage;

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Flame, Target, Plus, Dumbbell, Droplets, Beef } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { healthProvider } from '@/providers/health';
import { supabase } from '@/integrations/supabase/client';
import type { HealthMetrics } from '@/providers/health';
import { Skeleton } from '@/components/ui/skeleton';
import GoalEditorModal from '@/components/profile/GoalEditorModal';
import GoalProgressCard from '@/components/home/GoalProgressCard';
import DailyTipsCard from '@/components/home/DailyTipsCard';

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [weeklySessionsCompleted, setWeeklySessionsCompleted] = useState(0);
  const [currentWeight, setCurrentWeight] = useState<number | null>(null);
  const [currentBodyFat, setCurrentBodyFat] = useState<number | null>(null);
  const [proteinConsumed, setProteinConsumed] = useState<number>(0);

  // Goals from profile or defaults
  const caloriesGoal = profile?.target_calories ?? 2000;
  const waterGoal = profile?.target_water_ml ?? 2500;
  // Protein goal: default to 2g per kg of body weight
  const proteinGoal = profile?.weight_kg ? Math.round(profile.weight_kg * 2) : 120;

  const fetchMetrics = useCallback(async () => {
    if (!user) return;
    healthProvider.setUserId(user.id);
    const todayMetrics = await healthProvider.getTodayMetrics();
    setMetrics(todayMetrics);
    setIsLoading(false);
  }, [user]);

  // Fetch current weight and body fat from latest data
  const fetchCurrentMetrics = useCallback(async () => {
    if (!user) return;

    // Try daily_metrics first for weight and body fat
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

    // Fallback to body_composition for more detailed data
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

  // Fetch today's protein intake
  const fetchProteinIntake = useCallback(async () => {
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const startOfDay = `${today}T00:00:00`;
    const endOfDay = `${today}T23:59:59`;

    const { data } = await supabase
      .from('nutrition_logs')
      .select('protein')
      .eq('user_id', user.id)
      .gte('logged_at', startOfDay)
      .lte('logged_at', endOfDay);

    if (data) {
      const total = data.reduce((sum, log) => sum + (log.protein || 0), 0);
      setProteinConsumed(Math.round(total));
    }
  }, [user]);

  // Fetch weekly sessions count
  const fetchWeeklySessions = useCallback(async () => {
    if (!user) return;

    // Get start of current week (Monday)
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

  useEffect(() => {
    fetchMetrics();
    fetchWeeklySessions();
    fetchCurrentMetrics();
    fetchProteinIntake();

    // Subscribe to real-time updates
    if (user) {
      healthProvider.setUserId(user.id);
      const unsubscribe = healthProvider.subscribeToMetrics((newMetrics) => {
        setMetrics(newMetrics);
      });

      // Subscribe to activities changes
      const activitiesChannel = supabase
        .channel('homepage_activities')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'activities',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchWeeklySessions();
          }
        )
        .subscribe();

      // Subscribe to nutrition_logs changes for protein and calories updates
      const nutritionChannel = supabase
        .channel('homepage_nutrition')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'nutrition_logs',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchProteinIntake();
            fetchMetrics(); // Re-fetch metrics to update calories
          }
        )
        .subscribe();

      return () => {
        unsubscribe();
        supabase.removeChannel(activitiesChannel);
        supabase.removeChannel(nutritionChannel);
      };
    }
  }, [user, fetchMetrics, fetchWeeklySessions, fetchCurrentMetrics, fetchProteinIntake]);

  const firstName = profile?.first_name || user?.email?.split('@')[0] || 'Athlète';
  const caloriesConsumed = metrics?.caloriesIn || 0;
  const caloriesPercentage = (caloriesConsumed / caloriesGoal) * 100;
  const waterConsumed = metrics?.waterMl || 0;
  const waterPercentage = (waterConsumed / waterGoal) * 100;
  const proteinPercentage = (proteinConsumed / proteinGoal) * 100;

  const weeklySessionsTotal = profile?.activity_level === 'very_active' ? 6 
    : profile?.activity_level === 'active' ? 5
    : profile?.activity_level === 'moderate' ? 4
    : profile?.activity_level === 'light' ? 3
    : 2;

  if (isLoading) {
    return (
      <div className="safe-top px-4 pb-4 pt-2">
        <div className="mb-6">
          <Skeleton className="mb-2 h-4 w-24" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="mb-4 h-24 w-full rounded-2xl" />
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
        <Skeleton className="mb-4 h-20 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="safe-top px-4 pb-4 pt-2">
      {/* Header */}
      <div className="mb-6">
        <span className="text-sm text-muted-foreground">Bonjour 👋</span>
        <h1 className="text-2xl font-bold text-foreground">
          {firstName}, <span className="text-gradient-primary">prêt à transpirer ?</span>
        </h1>
      </div>

      {/* Goal Progress Card */}
      <div>
        <GoalProgressCard 
          profile={profile} 
          currentWeight={currentWeight}
          currentBodyFat={currentBodyFat}
        />
      </div>

      {/* Nutrition summary - Calories, Protéines, Hydratation */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        {/* Calories Card */}
        <div className="card-premium p-3 group">
          <div className="mb-1.5 flex items-center gap-1.5">
            <div className="relative">
              <Flame className="h-3.5 w-3.5 text-primary" />
              <div className="absolute inset-0 bg-primary/30 blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xs text-muted-foreground">Calories</span>
          </div>
          {caloriesConsumed > 0 ? (
            <>
              <p className="mb-1.5 text-lg font-bold text-foreground">
                {caloriesConsumed}
                <span className="text-xs font-normal text-muted-foreground">
                  /{caloriesGoal}
                </span>
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow transition-all"
                  style={{ width: `${Math.min(caloriesPercentage, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="py-1">
              <p className="text-sm text-muted-foreground">0/{caloriesGoal}</p>
            </div>
          )}
        </div>

        {/* Protein Card */}
        <div className="card-premium p-3 group">
          <div className="mb-1.5 flex items-center gap-1.5">
            <div className="relative">
              <Beef className="h-3.5 w-3.5 text-primary" />
              <div className="absolute inset-0 bg-primary/30 blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xs text-muted-foreground">Protéines</span>
          </div>
          {proteinConsumed > 0 ? (
            <>
              <p className="mb-1.5 text-lg font-bold text-foreground">
                {proteinConsumed}g
                <span className="text-xs font-normal text-muted-foreground">
                  /{proteinGoal}g
                </span>
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow transition-all"
                  style={{ width: `${Math.min(proteinPercentage, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="py-1">
              <p className="text-sm text-muted-foreground">0/{proteinGoal}g</p>
            </div>
          )}
        </div>

        {/* Hydration Card */}
        <div className="card-premium p-3 group">
          <div className="mb-1.5 flex items-center gap-1.5">
            <div className="relative">
              <Droplets className="h-3.5 w-3.5 text-water" />
              <div className="absolute inset-0 bg-water/30 blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xs text-muted-foreground">Hydratation</span>
          </div>
          {waterConsumed > 0 ? (
            <>
              <p className="mb-1.5 text-lg font-bold text-foreground">
                {(waterConsumed / 1000).toFixed(1)}L
                <span className="text-xs font-normal text-muted-foreground">
                  /{(waterGoal / 1000).toFixed(1)}L
                </span>
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-water to-water/70 transition-all"
                  style={{ width: `${Math.min(waterPercentage, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="py-1">
              <p className="text-sm text-muted-foreground">0/{(waterGoal / 1000).toFixed(1)}L</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Tips */}
      <div>
        <DailyTipsCard />
      </div>

      {/* Weekly progress */}
      <div className="mb-4 card-premium p-4">
        <p className="mb-2 text-sm font-medium text-foreground">Cette semaine</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-sm -z-10" />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {weeklySessionsCompleted}/{weeklySessionsTotal} séances
              </p>
              <p className="text-sm text-muted-foreground">
                {weeklySessionsCompleted === 0 
                  ? "C'est parti !" 
                  : "Continue comme ça !"}
              </p>
            </div>
          </div>
          {weeklySessionsCompleted > 0 && (
            <div className="flex items-center gap-1 text-primary">
              <span className="text-2xl">🔥</span>
              <span className="font-semibold">{weeklySessionsCompleted} {weeklySessionsCompleted === 1 ? 'jour' : 'jours'}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-4">
        <p className="mb-3 text-sm font-medium text-foreground">Accès rapide</p>
        <div className="space-y-2">
          {/* Add meal button */}
          <button
            onClick={() => navigate('/nutrition')}
            className="flex w-full items-center justify-between card-premium p-4"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
                <div className="absolute inset-0 rounded-xl bg-primary/20 blur-sm -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Ajouter un repas</p>
                <p className="text-sm text-muted-foreground">Enregistre ce que tu manges</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Explore equipment button */}
          <button
            onClick={() => navigate('/training?section=equipment')}
            className="flex w-full items-center justify-between card-premium p-4"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Voir les équipements</p>
                <p className="text-sm text-muted-foreground">Découvre les machines disponibles</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Goal button */}
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

      {/* Goal Editor Modal */}
      <GoalEditorModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        currentGoal={profile?.goal}
        currentTargetWeight={profile?.target_weight_kg}
      />
    </div>
  );
};

export default HomePage;

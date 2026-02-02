import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Zap, Flame, Target, Plus, Dumbbell, Apple, Droplets } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { healthProvider } from '@/providers/health';
import { supabase } from '@/integrations/supabase/client';
import type { HealthMetrics } from '@/providers/health';
import { Skeleton } from '@/components/ui/skeleton';
import GoalEditorModal from '@/components/profile/GoalEditorModal';
const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [weeklySessionsCompleted, setWeeklySessionsCompleted] = useState(0);

  // Goals from profile or defaults
  const caloriesGoal = 2000; // Could be calculated based on profile
  const waterGoal = 2500; // ml

  const fetchMetrics = useCallback(async () => {
    if (!user) return;
    
    healthProvider.setUserId(user.id);
    const todayMetrics = await healthProvider.getTodayMetrics();
    setMetrics(todayMetrics);
    setIsLoading(false);
  }, [user]);

  // Fetch weekly sessions count
  const fetchWeeklySessions = useCallback(async () => {
    if (!user) return;

    // Get start of current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Monday start
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

      return () => {
        unsubscribe();
        supabase.removeChannel(activitiesChannel);
      };
    }
  }, [user, fetchMetrics, fetchWeeklySessions]);

  const firstName = profile?.first_name || user?.email?.split('@')[0] || 'Athlète';
  const caloriesConsumed = metrics?.caloriesIn || 0;
  const caloriesPercentage = (caloriesConsumed / caloriesGoal) * 100;
  const waterConsumed = metrics?.waterMl || 0;
  const waterPercentage = (waterConsumed / waterGoal) * 100;

  // Mock workout data (will be replaced with real data later)
  const todayWorkout = {
    name: 'Full Body',
    exercises: 8,
    duration: 45,
  };

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
        <Skeleton className="mb-4 h-40 w-full rounded-2xl" />
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
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
          {firstName}, prêt à transpirer ?
        </h1>
      </div>

      {/* Today's workout */}
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Séance du jour</span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Planifiée
          </span>
        </div>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Dumbbell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">{todayWorkout.name}</p>
            <p className="text-sm text-muted-foreground">
              {todayWorkout.exercises} exercices • {todayWorkout.duration} min
            </p>
          </div>
        </div>
        <button 
          onClick={() => navigate('/training')}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98]"
        >
          <Zap className="h-5 w-5" />
          Commencer la séance
        </button>
      </div>

      {/* Nutrition summary - REAL DATA */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {/* Calories Card */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Flame className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Calories</span>
          </div>
          {caloriesConsumed > 0 ? (
            <>
              <p className="mb-2 text-2xl font-bold text-foreground">
                {caloriesConsumed}
                <span className="text-sm font-normal text-muted-foreground">
                  / {caloriesGoal}
                </span>
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(caloriesPercentage, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-2">
              <p className="text-sm text-muted-foreground">0 / {caloriesGoal}</p>
              <p className="text-xs text-muted-foreground/70">Dis-le au coach !</p>
            </div>
          )}
        </div>

        {/* Water Card */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Droplets className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Eau</span>
          </div>
          {waterConsumed > 0 ? (
            <>
              <p className="mb-2 text-2xl font-bold text-foreground">
                {(waterConsumed / 1000).toFixed(1)}L
                <span className="text-sm font-normal text-muted-foreground">
                  / {(waterGoal / 1000).toFixed(1)}L
                </span>
              </p>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div 
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(waterPercentage, 100)}%` }}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-2">
              <p className="text-sm text-muted-foreground">0L / {(waterGoal / 1000).toFixed(1)}L</p>
              <p className="text-xs text-muted-foreground/70">Hydrate-toi !</p>
            </div>
          )}
        </div>
      </div>

      {/* Weekly progress - REAL DATA */}
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <p className="mb-2 text-sm font-medium text-foreground">Cette semaine</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
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
              <span className="font-semibold">{weeklySessionsCompleted} jours</span>
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
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:bg-muted/50 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Plus className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Ajouter un repas</p>
                <p className="text-sm text-muted-foreground">Enregistre ce que tu manges</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Explore exercises button */}
          <button
            onClick={() => navigate('/training')}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:bg-muted/50 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Dumbbell className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium text-foreground">Explorer les exercices</p>
                <p className="text-sm text-muted-foreground">Découvre les machines Keep Cool</p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Goal button - dynamic text based on whether goal exists */}
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-4 transition-all hover:bg-muted/50 active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
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

import { Dumbbell, Clock, Flame, Trophy, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Skeleton } from '@/components/ui/skeleton';
import { usePerformanceStats } from '@/hooks/queries/usePerformanceQueries';

const PerformancePage = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { data: stats, isLoading } = usePerformanceStats(user?.id);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    return `${hours}h ${mins}min`;
  };

  const goals = profile ? [
    {
      id: 'weight',
      name: 'Poids actuel',
      current: profile.weight_kg || 0,
      target: profile.target_weight_kg || profile.weight_kg || 0,
      unit: 'kg',
      type: profile.target_weight_kg && profile.weight_kg
        ? (profile.target_weight_kg < profile.weight_kg ? 'loss' : 'gain')
        : 'maintain',
    },
  ].filter(g => g.target > 0) : [];

  if (isLoading || !stats) {
    return (
      <div className="safe-top px-4 pb-4 pt-2">
        <div className="mb-6">
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  const hasData = stats.totalSessions > 0;

  return (
    <div className="safe-top px-4 pb-4 pt-2">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Performance</h1>
        <p className="text-sm text-muted-foreground">Suivi de ta progression</p>
      </div>

      {/* Stats grid */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Séances totales</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalSessions}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Temps total</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{formatTime(stats.totalTimeMin)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <Flame className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Calories brûlées</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {stats.totalCalories.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-1 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Série actuelle</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.currentStreak} jours</p>
        </div>
      </div>

      {/* Goals section */}
      {goals.length > 0 && (
        <div className="mb-4">
          <p className="mb-3 text-sm font-medium text-foreground">Mon objectif</p>
          <div className="space-y-3">
            {goals.map((goal) => (
              <div key={goal.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                      <TrendingUp className="h-3 w-3 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{goal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {goal.current}{goal.unit} → {goal.target}{goal.unit}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for activities */}
      {!hasData && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Trophy className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="mb-2 font-semibold text-foreground">
            Aucune activité enregistrée
          </h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Commence à enregistrer tes séances d'entraînement pour voir ta progression ici.
          </p>
        </div>
      )}

      {/* Hint for future features */}
      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">
          💡 Bientôt disponible : graphiques d'évolution, records personnels et analyses détaillées.
        </p>
      </div>
    </div>
  );
};

export default PerformancePage;

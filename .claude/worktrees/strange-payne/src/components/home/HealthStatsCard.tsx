import { Moon, Heart, Footprints, Timer, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface HealthStats {
  sleepHours: number | null;
  steps: number | null;
  heartRateAvg: number | null;
  heartRateResting: number | null;
  activeMinutes: number | null;
  floorsClimbed: number | null;
}

interface HealthStatsCardProps {
  stats: HealthStats;
  isLoading?: boolean;
  targetSteps?: number;
  targetSleepHours?: number;
}

const HealthStatsCard = ({ 
  stats, 
  isLoading = false,
  targetSteps = 10000,
  targetSleepHours = 8
}: HealthStatsCardProps) => {
  const hasAnyData = stats.sleepHours !== null || 
                     stats.steps !== null || 
                     stats.heartRateAvg !== null ||
                     stats.activeMinutes !== null;

  if (isLoading) {
    return (
      <div className="mb-4">
        <p className="mb-3 text-sm font-medium text-foreground">Statistiques santé</p>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const statItems = [
    {
      icon: Moon,
      label: 'Sommeil',
      value: stats.sleepHours,
      displayValue: stats.sleepHours !== null ? `${stats.sleepHours.toFixed(1)}h` : null,
      target: targetSleepHours,
      targetLabel: `/${targetSleepHours}h`,
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      progressColor: 'from-indigo-500 to-indigo-400',
    },
    {
      icon: Heart,
      label: 'Rythme cardiaque',
      value: stats.heartRateAvg,
      displayValue: stats.heartRateAvg !== null ? `${stats.heartRateAvg}` : null,
      suffix: 'bpm',
      subValue: stats.heartRateResting !== null ? `Repos: ${stats.heartRateResting} bpm` : null,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
    },
    {
      icon: Footprints,
      label: 'Pas',
      value: stats.steps,
      displayValue: stats.steps !== null ? stats.steps.toLocaleString() : null,
      target: targetSteps,
      targetLabel: `/${(targetSteps / 1000).toFixed(0)}k`,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      progressColor: 'from-emerald-500 to-emerald-400',
    },
    {
      icon: Timer,
      label: 'Minutes actives',
      value: stats.activeMinutes,
      displayValue: stats.activeMinutes !== null ? `${stats.activeMinutes}` : null,
      suffix: 'min',
      subValue: stats.floorsClimbed !== null && stats.floorsClimbed > 0 
        ? `${stats.floorsClimbed} étages` 
        : null,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <div className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Statistiques santé</p>
        {!hasAnyData && (
          <span className="text-xs text-muted-foreground">Connectez vos appareils</span>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        {statItems.map((item) => {
          const Icon = item.icon;
          const hasValue = item.displayValue !== null;
          const percentage = item.target && item.value 
            ? Math.min((item.value / item.target) * 100, 100) 
            : 0;

          return (
            <div 
              key={item.label}
              className="card-premium p-3 group"
            >
              <div className="mb-2 flex items-center gap-2">
                <div className={`relative flex h-8 w-8 items-center justify-center rounded-lg ${item.bgColor}`}>
                  <Icon className={`h-4 w-4 ${item.color}`} />
                  <div className={`absolute inset-0 rounded-lg ${item.bgColor} blur-sm opacity-0 group-hover:opacity-100 transition-opacity -z-10`} />
                </div>
                <span className="text-xs text-muted-foreground">{item.label}</span>
              </div>

              {hasValue ? (
                <>
                  <p className="text-lg font-bold text-foreground">
                    {item.displayValue}
                    {item.suffix && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {item.suffix}
                      </span>
                    )}
                    {item.targetLabel && (
                      <span className="text-xs font-normal text-muted-foreground">
                        {item.targetLabel}
                      </span>
                    )}
                  </p>
                  
                  {item.subValue && (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.subValue}</p>
                  )}

                  {item.progressColor && percentage > 0 && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div 
                        className={`h-full rounded-full bg-gradient-to-r ${item.progressColor} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-xs">Non connecté</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HealthStatsCard;

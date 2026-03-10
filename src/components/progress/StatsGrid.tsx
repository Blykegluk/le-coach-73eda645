import { Dumbbell, Clock, Flame, Trophy, CalendarDays } from 'lucide-react';

interface StatsGridProps {
  stats: {
    totalSessions: number;
    totalTimeMin: number;
    totalCalories: number;
    currentStreak: number;
  } | null;
  isLoading: boolean;
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

const StatsGrid = ({ stats, isLoading }: StatsGridProps) => {
  const items = [
    {
      icon: Dumbbell,
      value: stats?.totalSessions ?? 0,
      label: 'Séances',
      format: (v: number) => String(v),
    },
    {
      icon: Clock,
      value: stats?.totalTimeMin ?? 0,
      label: 'Temps total',
      format: (v: number) => formatTime(v),
    },
    {
      icon: Flame,
      value: stats?.totalCalories ?? 0,
      label: 'Calories',
      format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v),
    },
    {
      icon: Trophy,
      value: stats?.currentStreak ?? 0,
      label: 'Série (j)',
      format: (v: number) => String(v),
    },
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Cette semaine</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ icon: Icon, value, label, format }) => (
          <div
            key={label}
            className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-3 flex items-center gap-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              {isLoading ? (
                <div className="h-6 w-12 rounded bg-muted animate-pulse" />
              ) : (
                <p className="text-lg font-bold text-foreground leading-tight">
                  {format(value)}
                </p>
              )}
              <p className="text-xs text-muted-foreground truncate">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsGrid;

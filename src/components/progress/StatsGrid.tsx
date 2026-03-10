import { useState } from 'react';
import { Dumbbell, Clock, Flame, Trophy, CalendarDays, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { PerformanceStats } from '@/hooks/queries/usePerformanceQueries';

interface StatsGridProps {
  stats: PerformanceStats | null;
  isLoading: boolean;
}

type DetailType = 'sessions' | 'time' | 'calories' | 'streak';

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h${m}` : `${h}h`;
}

/** Group activities by type and aggregate */
function groupByType(activities: PerformanceStats['weekActivities']) {
  const map = new Map<string, { count: number; totalMin: number; totalCal: number }>();
  for (const a of activities) {
    const type = a.activity_type || 'Autre';
    const prev = map.get(type) || { count: 0, totalMin: 0, totalCal: 0 };
    map.set(type, {
      count: prev.count + 1,
      totalMin: prev.totalMin + (a.duration_min || 0),
      totalCal: prev.totalCal + (a.calories_burned || 0),
    });
  }
  return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
}

const StatsGrid = ({ stats, isLoading }: StatsGridProps) => {
  const [detail, setDetail] = useState<{ type: DetailType; isOpen: boolean }>({
    type: 'sessions',
    isOpen: false,
  });

  const items: Array<{
    icon: typeof Dumbbell;
    value: number;
    label: string;
    fmt: (v: number) => string;
    detailType: DetailType;
  }> = [
    {
      icon: Dumbbell,
      value: stats?.totalSessions ?? 0,
      label: 'Séances',
      fmt: (v: number) => String(v),
      detailType: 'sessions',
    },
    {
      icon: Clock,
      value: stats?.totalTimeMin ?? 0,
      label: 'Temps total',
      fmt: (v: number) => formatTime(v),
      detailType: 'time',
    },
    {
      icon: Flame,
      value: stats?.totalCalories ?? 0,
      label: 'Calories',
      fmt: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v),
      detailType: 'calories',
    },
    {
      icon: Trophy,
      value: stats?.currentStreak ?? 0,
      label: 'Série (j)',
      fmt: (v: number) => String(v),
      detailType: 'streak',
    },
  ];

  const activities = stats?.weekActivities ?? [];
  const grouped = groupByType(activities);

  const renderDetailContent = () => {
    switch (detail.type) {
      case 'sessions':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              {activities.length} séance{activities.length !== 1 ? 's' : ''} cette semaine
            </p>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune séance enregistrée</p>
            ) : (
              <>
                {/* By type */}
                <div className="space-y-2 mb-4">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Par type</p>
                  {grouped.map(([type, data]) => (
                    <div key={type} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                      <span className="text-sm font-medium text-foreground capitalize">{type}</span>
                      <span className="text-sm text-muted-foreground">
                        {data.count}× • {formatTime(data.totalMin)}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Individual list */}
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Détail</p>
                {activities.map((a, i) => {
                  const date = new Date(a.performed_at);
                  return (
                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30">
                      <div>
                        <p className="text-sm font-medium text-foreground capitalize">{a.activity_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(date, 'EEEE d MMM', { locale: fr })} à {format(date, 'HH:mm')}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">{a.duration_min} min</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );

      case 'time':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              {formatTime(stats?.totalTimeMin ?? 0)} d'entraînement cette semaine
            </p>
            {grouped.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée</p>
            ) : (
              <>
                {grouped.map(([type, data]) => {
                  const pct = stats?.totalTimeMin ? Math.round((data.totalMin / stats.totalTimeMin) * 100) : 0;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground capitalize">{type}</span>
                        <span className="text-sm text-muted-foreground">{formatTime(data.totalMin)} ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );

      case 'calories':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              {stats?.totalCalories ?? 0} kcal brûlées cette semaine
            </p>
            {grouped.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Aucune donnée</p>
            ) : (
              <>
                {grouped.map(([type, data]) => {
                  const pct = stats?.totalCalories ? Math.round((data.totalCal / stats.totalCalories) * 100) : 0;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground capitalize">{type}</span>
                        <span className="text-sm text-muted-foreground">{data.totalCal} kcal ({pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );

      case 'streak':
        return (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground mb-4">
              {stats?.currentStreak ?? 0} jour{(stats?.currentStreak ?? 0) !== 1 ? 's' : ''} consécutif{(stats?.currentStreak ?? 0) !== 1 ? 's' : ''}
            </p>
            {(stats?.streakDates ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Entraîne-toi aujourd'hui pour démarrer ta série !
              </p>
            ) : (
              <div className="space-y-2">
                {(stats?.streakDates ?? []).map((dateStr, i) => {
                  const date = new Date(dateStr);
                  return (
                    <div key={dateStr} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/30">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <Trophy className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm text-foreground capitalize">
                        {format(date, 'EEEE d MMMM', { locale: fr })}
                      </span>
                      {i === 0 && (
                        <span className="ml-auto text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          Dernier
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
    }
  };

  const detailTitles: Record<DetailType, string> = {
    sessions: 'Séances cette semaine',
    time: 'Temps d\'entraînement',
    calories: 'Calories brûlées',
    streak: 'Série en cours',
  };

  return (
    <>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Cette semaine</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {items.map(({ icon: Icon, value, label, fmt, detailType }) => (
            <div
              key={label}
              onClick={() => !isLoading && setDetail({ type: detailType, isOpen: true })}
              className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-3 flex items-center gap-3 cursor-pointer hover:bg-primary/5 active:scale-[0.98] transition-all"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                {isLoading ? (
                  <div className="h-6 w-12 rounded bg-muted animate-pulse" />
                ) : (
                  <p className="text-lg font-bold text-foreground leading-tight">
                    {fmt(value)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground truncate">{label}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <Sheet
        open={detail.isOpen}
        onOpenChange={(open) => setDetail(prev => ({ ...prev, isOpen: open }))}
      >
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>{detailTitles[detail.type]}</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(70vh-100px)]">
            <div className="pr-4">
              {renderDetailContent()}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default StatsGrid;

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dumbbell, Clock, Flame, Calendar, Trash2, Bike, PersonStanding, Waves, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday, isYesterday, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Activity {
  id: string;
  activity_type: string;
  duration_min: number;
  calories_burned: number | null;
  distance_km: number | null;
  notes: string | null;
  performed_at: string;
}

// Equipment data - to be customized later
const equipmentCategories = [
  {
    name: 'Cardio',
    icon: <Bike className="h-5 w-5" />,
    items: ['Tapis de course', 'Vélo elliptique', 'Rameur', 'Vélo stationnaire', 'Stepper'],
  },
  {
    name: 'Musculation',
    icon: <Dumbbell className="h-5 w-5" />,
    items: ['Presse à cuisses', 'Machine à tirage', 'Banc de développé couché', 'Poulie haute/basse', 'Smith machine'],
  },
  {
    name: 'Fonctionnel',
    icon: <PersonStanding className="h-5 w-5" />,
    items: ['TRX', 'Kettlebells', 'Battle ropes', 'Box jumps', 'Medecine balls'],
  },
  {
    name: 'Récupération',
    icon: <Waves className="h-5 w-5" />,
    items: ['Rouleaux de massage', 'Tapis de stretching', 'Élastiques', 'Swiss ball'],
  },
];

const TrainingPage = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const equipmentRef = useRef<HTMLDivElement>(null);

  const fetchActivities = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', user.id)
      .order('performed_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setActivities(data as Activity[]);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchActivities();

    // Subscribe to real-time changes
    if (user) {
      const channel = supabase
        .channel('training_activities')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'activities',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchActivities();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, fetchActivities]);

  // Scroll to equipment section if query param present
  useEffect(() => {
    if (searchParams.get('section') === 'equipment' && equipmentRef.current && !isLoading) {
      setTimeout(() => {
        equipmentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [searchParams, isLoading]);

  const handleDeleteActivity = async (activityId: string) => {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId)
      .eq('user_id', user?.id);

    if (!error) {
      setActivities(prev => prev.filter(a => a.id !== activityId));
    }
  };

  // Group activities
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const todayActivities = activities.filter(a => isToday(new Date(a.performed_at)));
  const thisWeekActivities = activities.filter(a => {
    const date = new Date(a.performed_at);
    return !isToday(date) && isWithinInterval(date, { start: weekStart, end: weekEnd });
  });
  const olderActivities = activities.filter(a => {
    const date = new Date(a.performed_at);
    return !isWithinInterval(date, { start: weekStart, end: weekEnd });
  });

  // Stats for the week
  const weeklyStats = activities
    .filter(a => isWithinInterval(new Date(a.performed_at), { start: weekStart, end: weekEnd }))
    .reduce(
      (acc, a) => ({
        sessions: acc.sessions + 1,
        totalMinutes: acc.totalMinutes + a.duration_min,
        totalCalories: acc.totalCalories + (a.calories_burned || 0),
      }),
      { sessions: 0, totalMinutes: 0, totalCalories: 0 }
    );

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), "HH:mm");
  };

  const ActivityCard = ({ activity }: { activity: Activity }) => (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:bg-muted/30">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
        <Dumbbell className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground capitalize truncate">{activity.activity_type}</p>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {activity.duration_min} min
          </span>
          {activity.calories_burned && (
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3" />
              {activity.calories_burned} kcal
            </span>
          )}
          {activity.distance_km && (
            <span>{activity.distance_km} km</span>
          )}
        </div>
        {activity.notes && (
          <p className="text-xs text-muted-foreground/70 truncate mt-1">{activity.notes}</p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className="text-xs text-muted-foreground">{formatTime(activity.performed_at)}</span>
        <button
          onClick={() => handleDeleteActivity(activity.id)}
          className="p-1 text-muted-foreground/50 hover:text-destructive transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const ActivitySection = ({ title, items }: { title: string; items: Activity[] }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="space-y-2">
          {items.map(activity => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="safe-top px-4 pb-4 pt-2">
        <div className="mb-6">
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-24 w-full rounded-2xl mb-4" />
        <Skeleton className="h-20 w-full rounded-xl mb-2" />
        <Skeleton className="h-20 w-full rounded-xl mb-2" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="safe-top px-4 pb-4 pt-2">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Entraînement</h1>
        <p className="text-sm text-muted-foreground">Ton historique d'activités</p>
      </div>

      {/* Weekly stats */}
      {weeklyStats.sessions > 0 && (
        <div className="mb-6 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Cette semaine</span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{weeklyStats.sessions}</p>
              <p className="text-xs text-muted-foreground">séances</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{weeklyStats.totalMinutes}</p>
              <p className="text-xs text-muted-foreground">minutes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{weeklyStats.totalCalories}</p>
              <p className="text-xs text-muted-foreground">kcal</p>
            </div>
          </div>
        </div>
      )}

      {/* Activities list */}
      {activities.length > 0 ? (
        <>
          <ActivitySection title="Aujourd'hui" items={todayActivities} />
          <ActivitySection title="Cette semaine" items={thisWeekActivities} />
          <ActivitySection title="Plus ancien" items={olderActivities} />
        </>
      ) : (
        /* Empty state */
        <div className="mb-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Dumbbell className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            Aucune activité enregistrée
          </h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Dis au coach ce que tu as fait ! Ex: "J'ai fait 30 min de muscu ce matin"
          </p>
        </div>
      )}

      {/* Equipment Section */}
      <div ref={equipmentRef} className="mb-6">
        <div className="mb-4 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Équipements disponibles</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Découvre les machines et équipements de ta salle de sport
        </p>
        
        <div className="space-y-3">
          {equipmentCategories.map((category) => (
            <div
              key={category.name}
              className="rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {category.icon}
                </div>
                <h3 className="font-semibold text-foreground">{category.name}</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {category.items.map((item) => (
                  <span
                    key={item}
                    className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs text-muted-foreground/70 text-center">
          💡 Cette section sera personnalisée selon ta salle de sport
        </p>
      </div>

      {/* Tip */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">
          💡 Enregistre tes séances via le coach IA : "J'ai fait 1h de musculation" ou "30 min de course à 8 km/h"
        </p>
      </div>
    </div>
  );
};

export default TrainingPage;

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dumbbell, Clock, Flame, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isToday } from 'date-fns';
import NextWorkoutCard from '@/components/training/NextWorkoutCard';
import EquipmentSection from '@/components/training/EquipmentSection';
import WeeklyCarousel from '@/components/training/WeeklyCarousel';
import {
  useActivities,
  useUserWeight,
  useTrainingRealtimeInvalidation,
  trainingKeys,
} from '@/hooks/queries/useTrainingQueries';

interface Activity {
  id: string;
  activity_type: string;
  duration_min: number;
  calories_burned: number | null;
  distance_km: number | null;
  notes: string | null;
  performed_at: string;
}

// Estimate calories if not stored (MET-based calculation)
const estimateCalories = (activity: Activity, weightKg: number = 70): number => {
  if (activity.calories_burned !== null && activity.calories_burned > 0) {
    return activity.calories_burned;
  }

  const activityLower = activity.activity_type.toLowerCase();
  let met = 4;

  if (activityLower.includes("course") || activityLower.includes("running") || activityLower.includes("jogging")) {
    met = 8;
  } else if (activityLower.includes("musculation") || activityLower.includes("muscu") || activityLower.includes("poids") || activityLower.includes("épaules") || activityLower.includes("jambes") || activityLower.includes("dos") || activityLower.includes("pec")) {
    met = 5;
  } else if (activityLower.includes("hiit") || activityLower.includes("crossfit") || activityLower.includes("hyrox")) {
    met = 10;
  } else if (activityLower.includes("vélo") || activityLower.includes("cycling") || activityLower.includes("bike")) {
    met = 7;
  } else if (activityLower.includes("natation") || activityLower.includes("swimming") || activityLower.includes("nage")) {
    met = 7;
  } else if (activityLower.includes("yoga") || activityLower.includes("stretching") || activityLower.includes("pilates")) {
    met = 3;
  } else if (activityLower.includes("marche") || activityLower.includes("walk")) {
    met = 3.5;
  } else if (activityLower.includes("rameur") || activityLower.includes("rowing")) {
    met = 7;
  } else if (activityLower.includes("boxe") || activityLower.includes("boxing") || activityLower.includes("combat")) {
    met = 9;
  } else if (activityLower.includes("escalade") || activityLower.includes("climbing")) {
    met = 8;
  }

  return Math.round(met * weightKg * (activity.duration_min / 60));
};

const TrainingPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const equipmentRef = useRef<HTMLDivElement>(null);

  const { data: activities = [], isLoading } = useActivities(user?.id);
  const { data: userWeight = 70 } = useUserWeight(user?.id);
  useTrainingRealtimeInvalidation(user?.id);

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

    if (!error && user) {
      queryClient.invalidateQueries({ queryKey: trainingKeys.activities(user.id) });
    }
  };

  const todayActivities = activities.filter(a => isToday(new Date(a.performed_at)));

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), "HH:mm");
  };

  const ActivityCard = ({ activity }: { activity: Activity }) => {
    const calories = estimateCalories(activity, userWeight);
    const isEstimated = activity.calories_burned === null || activity.calories_burned === 0;

    return (
      <div className="flex items-center gap-3 card-premium p-4 group">
        <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Dumbbell className="h-6 w-6 text-primary" />
          <div className="absolute inset-0 rounded-xl bg-primary/20 blur-sm -z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground capitalize truncate">{activity.activity_type}</p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {activity.duration_min} min
            </span>
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-primary" />
              ~{calories} kcal{isEstimated ? '*' : ''}
            </span>
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
  };

  const ActivitySection = ({ title, items }: { title: string; items: Activity[] }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h3>
        <div className="space-y-2">
          {items.map((activity) => (
            <div key={activity.id}>
              <ActivityCard activity={activity} />
            </div>
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

      {/* Weekly stats carousel */}
      <WeeklyCarousel userWeight={userWeight} />

      {/* Activities list - Today only */}
      <ActivitySection title="Aujourd'hui" items={todayActivities} />

      {/* Next Workout Preparation - AI generated */}
      <div className="mb-6">
        <h2 className="mb-3 text-lg font-bold text-foreground flex items-center gap-2">
          <div className="relative">
            <Dumbbell className="h-5 w-5 text-primary" />
            <div className="absolute inset-0 bg-primary/30 blur-sm rounded-full" />
          </div>
          Préparation de la prochaine séance
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          💡 Dis au coach "Je veux focus le haut du corps" pour adapter la séance
        </p>
        <NextWorkoutCard />
      </div>

      {/* Empty state when no activities */}
      {activities.length === 0 && (
        <div className="mb-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
          <div className="mb-4 relative flex h-16 w-16 items-center justify-center rounded-full bg-muted">
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
      <EquipmentSection scrollRef={equipmentRef} />

      {/* Tip */}
      <div className="card-premium p-4">
        <p className="text-xs text-muted-foreground">
          💡 Enregistre tes séances via le coach IA : "J'ai fait 1h de musculation" ou "30 min de course à 8 km/h"
        </p>
      </div>
    </div>
  );
};

export default TrainingPage;

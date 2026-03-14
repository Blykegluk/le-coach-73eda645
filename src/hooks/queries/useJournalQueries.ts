import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { format, startOfDay, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export interface JournalEntry {
  id: string;
  type: 'workout' | 'meal' | 'water';
  title: string;
  subtitle?: string;
  mealType?: string;
  time: Date;
  meta?: string;
  status?: string;
}

export interface DaySummary {
  calories: number;
  protein: number;
  carbs: number;
  waterMl: number;
}

export interface JournalData {
  entries: JournalEntry[];
  summary: DaySummary;
}

// ── Query keys ──────────────────────────────────────────
export const journalKeys = {
  all: ['journal'] as const,
  day: (userId: string, dateStr: string) => [...journalKeys.all, 'day', userId, dateStr] as const,
};

// ── Journal day data (workouts + meals + water) ─────────
export function useJournalDay(userId: string | undefined, selectedDate: Date) {
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  return useQuery({
    queryKey: journalKeys.day(userId ?? '', dateStr),
    queryFn: async (): Promise<JournalData> => {
      const startOfDayDate = startOfDay(selectedDate);
      const endOfDayDate = new Date(startOfDayDate);
      endOfDayDate.setDate(endOfDayDate.getDate() + 1);

      const allEntries: JournalEntry[] = [];

      const { data: workouts } = await supabase
        .from('workout_sessions')
        .select('id, workout_name, started_at, completed_at, total_duration_seconds, target_muscles, status, calories_burned, notes')
        .eq('user_id', userId!)
        .eq('status', 'completed')
        .gte('started_at', startOfDayDate.toISOString())
        .lt('started_at', endOfDayDate.toISOString())
        .order('started_at', { ascending: true });

      if (workouts) {
        workouts.forEach(w => {
          const duration = w.total_duration_seconds
            ? `${Math.round(w.total_duration_seconds / 60)} min`
            : 'Terminée';
          allEntries.push({
            id: `workout-${w.id}`,
            type: 'workout',
            title: w.workout_name,
            subtitle: w.target_muscles?.join(', ') || w.notes || 'Entraînement',
            time: parseISO(w.started_at),
            meta: `${duration}${w.calories_burned ? ` · ${w.calories_burned} kcal` : ''}`,
            status: 'completed',
          });
        });
      }

      const { data: meals } = await supabase
        .from('nutrition_logs')
        .select('id, food_name, meal_type, calories, protein, carbs, logged_at')
        .eq('user_id', userId!)
        .gte('logged_at', startOfDayDate.toISOString())
        .lt('logged_at', endOfDayDate.toISOString())
        .order('logged_at', { ascending: true });

      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;

      if (meals) {
        const mealTypeLabels: Record<string, string> = {
          breakfast: 'Petit-déjeuner',
          lunch: 'Déjeuner',
          dinner: 'Dîner',
          snack: 'Collation',
        };
        meals.forEach(m => {
          totalCalories += m.calories || 0;
          totalProtein += m.protein || 0;
          totalCarbs += m.carbs || 0;
          allEntries.push({
            id: `meal-${m.id}`,
            type: 'meal',
            title: m.food_name,
            subtitle: mealTypeLabels[m.meal_type] || m.meal_type,
            mealType: m.meal_type,
            time: parseISO(m.logged_at),
            meta: m.calories ? `${m.calories} kcal` : undefined,
          });
        });
      }

      const { data: metrics } = await supabase
        .from('daily_metrics')
        .select('water_ml, updated_at')
        .eq('user_id', userId!)
        .eq('date', dateStr)
        .maybeSingle();

      const waterMl = metrics?.water_ml || 0;

      if (waterMl) {
        allEntries.push({
          id: `water-${dateStr}`,
          type: 'water',
          title: 'Hydratation',
          subtitle: `${waterMl} ml`,
          time: parseISO(metrics!.updated_at),
          meta: `${Math.round((waterMl / 2000) * 100)}%`,
        });
      }

      allEntries.sort((a, b) => a.time.getTime() - b.time.getTime());

      return {
        entries: allEntries,
        summary: {
          calories: Math.round(totalCalories),
          protein: Math.round(totalProtein),
          carbs: Math.round(totalCarbs),
          waterMl,
        },
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

// ── Realtime invalidation ───────────────────────────────
export function useJournalRealtimeInvalidation(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const nutritionChannel = supabase
      .channel('journal_nutrition_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'nutrition_logs',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: journalKeys.all });
      })
      .subscribe();

    const workoutChannel = supabase
      .channel('journal_workout_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workout_sessions',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: journalKeys.all });
      })
      .subscribe();

    const metricsChannel = supabase
      .channel('journal_metrics_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_metrics',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: journalKeys.all });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(nutritionChannel);
      supabase.removeChannel(workoutChannel);
      supabase.removeChannel(metricsChannel);
    };
  }, [userId, queryClient]);
}

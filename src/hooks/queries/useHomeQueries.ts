import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { healthProvider } from '@/providers/health';
import type { HealthMetrics } from '@/providers/health';
import type { Workout } from '@/components/training/NextWorkoutCard';

const WORKOUT_STORAGE_KEY = 'prepared_workout';

// ── Query keys ──────────────────────────────────────────
export const homeKeys = {
  all: ['home'] as const,
  todayMetrics: (userId: string) => [...homeKeys.all, 'todayMetrics', userId] as const,
  weeklySessions: (userId: string) => [...homeKeys.all, 'weeklySessions', userId] as const,
  currentWeight: (userId: string) => [...homeKeys.all, 'currentWeight', userId] as const,
  todayNutrition: (userId: string) => [...homeKeys.all, 'todayNutrition', userId] as const,
  healthStats: (userId: string) => [...homeKeys.all, 'healthStats', userId] as const,
  preparedWorkout: (userId: string) => [...homeKeys.all, 'preparedWorkout', userId] as const,
};

// ── Today's metrics (via healthProvider for React Native compat) ─
export function useTodayMetrics(userId: string | undefined) {
  return useQuery({
    queryKey: homeKeys.todayMetrics(userId ?? ''),
    queryFn: async (): Promise<HealthMetrics | null> => {
      healthProvider.setUserId(userId!);
      return healthProvider.getTodayMetrics();
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

// ── Weekly sessions count ───────────────────────────────
export function useWeeklySessions(userId: string | undefined) {
  return useQuery({
    queryKey: homeKeys.weeklySessions(userId ?? ''),
    queryFn: async (): Promise<number> => {
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - diff);
      startOfWeek.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId!)
        .gte('performed_at', startOfWeek.toISOString());

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

// ── Current weight + body fat ───────────────────────────
interface CurrentMetrics {
  weight: number | null;
  bodyFat: number | null;
}

export function useCurrentWeight(userId: string | undefined) {
  return useQuery({
    queryKey: homeKeys.currentWeight(userId ?? ''),
    queryFn: async (): Promise<CurrentMetrics> => {
      const [dailyRes, bodyRes] = await Promise.all([
        supabase
          .from('daily_metrics')
          .select('weight, body_fat_pct')
          .eq('user_id', userId!)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('body_composition')
          .select('weight_kg, body_fat_pct')
          .eq('user_id', userId!)
          .order('measured_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const weight = dailyRes.data?.weight ?? bodyRes.data?.weight_kg ?? null;
      const bodyFat = dailyRes.data?.body_fat_pct ?? bodyRes.data?.body_fat_pct ?? null;
      return { weight, bodyFat };
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}

// ── Today's nutrition intake ────────────────────────────
interface TodayNutrition {
  calories: number;
  protein: number;
  loggedMealTypes: string[];
}

export function useTodayNutrition(userId: string | undefined) {
  return useQuery({
    queryKey: homeKeys.todayNutrition(userId ?? ''),
    queryFn: async (): Promise<TodayNutrition> => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('calories, protein, meal_type')
        .eq('user_id', userId!)
        .gte('logged_at', `${today}T00:00:00`)
        .lte('logged_at', `${today}T23:59:59`);

      if (error) throw error;
      if (!data) return { calories: 0, protein: 0, loggedMealTypes: [] };

      return {
        calories: Math.round(data.reduce((sum, log) => sum + (log.calories || 0), 0)),
        protein: Math.round(data.reduce((sum, log) => sum + (log.protein || 0), 0)),
        loggedMealTypes: data.map(log => log.meal_type),
      };
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

// ── Health stats (sleep, steps, heart rate, etc.) ───────
interface HealthStats {
  sleepHours: number | null;
  steps: number | null;
  heartRateAvg: number | null;
  heartRateResting: number | null;
  activeMinutes: number | null;
  floorsClimbed: number | null;
}

export function useHealthStats(userId: string | undefined) {
  return useQuery({
    queryKey: homeKeys.healthStats(userId ?? ''),
    queryFn: async (): Promise<HealthStats> => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_metrics')
        .select('sleep_hours, steps, heart_rate_avg, heart_rate_resting, active_minutes, floors_climbed')
        .eq('user_id', userId!)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      return {
        sleepHours: data?.sleep_hours ?? null,
        steps: data?.steps ?? null,
        heartRateAvg: data?.heart_rate_avg ?? null,
        heartRateResting: data?.heart_rate_resting ?? null,
        activeMinutes: data?.active_minutes ?? null,
        floorsClimbed: data?.floors_climbed ?? null,
      };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

// ── Prepared workout ────────────────────────────────────
export function usePreparedWorkout(userId: string | undefined) {
  return useQuery({
    queryKey: homeKeys.preparedWorkout(userId ?? ''),
    queryFn: async (): Promise<Workout | null> => {
      const { data, error } = await supabase
        .from('user_context')
        .select('value')
        .eq('user_id', userId!)
        .eq('key', WORKOUT_STORAGE_KEY)
        .maybeSingle();

      if (error) throw error;
      if (!data?.value) return null;

      try {
        return JSON.parse(data.value) as Workout;
      } catch {
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}

// ── Realtime invalidation hook ──────────────────────────
// Subscribes to Supabase Realtime changes and invalidates relevant queries
export function useHomeRealtimeInvalidation(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const activitiesChannel = supabase
      .channel('home_activities_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'activities',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: homeKeys.weeklySessions(userId) });
      })
      .subscribe();

    const nutritionChannel = supabase
      .channel('home_nutrition_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'nutrition_logs',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: homeKeys.todayNutrition(userId) });
      })
      .subscribe();

    const metricsChannel = supabase
      .channel('home_metrics_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_metrics',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: homeKeys.todayMetrics(userId) });
        queryClient.invalidateQueries({ queryKey: homeKeys.healthStats(userId) });
      })
      .subscribe();

    const contextChannel = supabase
      .channel('home_context_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_context',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: homeKeys.preparedWorkout(userId) });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(activitiesChannel);
      supabase.removeChannel(nutritionChannel);
      supabase.removeChannel(metricsChannel);
      supabase.removeChannel(contextChannel);
    };
  }, [userId, queryClient]);
}

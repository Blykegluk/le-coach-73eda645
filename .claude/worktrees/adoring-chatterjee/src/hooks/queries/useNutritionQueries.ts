import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NutritionLog {
  id: string;
  meal_type: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_at: string;
}

// ── Query keys ──────────────────────────────────────────
export const nutritionKeys = {
  all: ['nutrition'] as const,
  todayMeals: (userId: string, date: string) => [...nutritionKeys.all, 'meals', userId, date] as const,
  todayWater: (userId: string, date: string) => [...nutritionKeys.all, 'water', userId, date] as const,
};

// ── Today's meals ───────────────────────────────────────
export function useTodayMeals(userId: string | undefined, date: string) {
  return useQuery({
    queryKey: nutritionKeys.todayMeals(userId ?? '', date),
    queryFn: async (): Promise<NutritionLog[]> => {
      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('id, meal_type, food_name, calories, protein, carbs, fat, logged_at')
        .eq('user_id', userId!)
        .gte('logged_at', `${date}T00:00:00`)
        .lte('logged_at', `${date}T23:59:59`)
        .order('logged_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as NutritionLog[];
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

// ── Today's water ───────────────────────────────────────
export function useTodayWater(userId: string | undefined, date: string) {
  return useQuery({
    queryKey: nutritionKeys.todayWater(userId ?? '', date),
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('daily_metrics')
        .select('water_ml')
        .eq('user_id', userId!)
        .eq('date', date)
        .maybeSingle();

      if (error) throw error;
      return data?.water_ml ?? 0;
    },
    enabled: !!userId,
    staleTime: 30_000,
  });
}

// ── Add water mutation ──────────────────────────────────
export function useAddWater(userId: string | undefined, date: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (addMl: number) => {
      // Get current water
      const current = queryClient.getQueryData<number>(nutritionKeys.todayWater(userId ?? '', date)) ?? 0;
      const newWaterMl = current + addMl;

      const { error } = await supabase
        .from('daily_metrics')
        .upsert(
          { user_id: userId!, date, water_ml: newWaterMl },
          { onConflict: 'user_id,date' }
        );
      if (error) throw error;
      return newWaterMl;
    },
    onSuccess: (newWaterMl) => {
      queryClient.setQueryData(nutritionKeys.todayWater(userId ?? '', date), newWaterMl);
    },
  });
}

// ── Delete meal mutation ────────────────────────────────
export function useDeleteMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (logId: string) => {
      const { error } = await supabase.from('nutrition_logs').delete().eq('id', logId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: nutritionKeys.all });
    },
  });
}

// ── Realtime invalidation ───────────────────────────────
export function useNutritionRealtimeInvalidation(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const mealsChannel = supabase
      .channel('nutrition_meals_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'nutrition_logs',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: nutritionKeys.all });
      })
      .subscribe();

    const metricsChannel = supabase
      .channel('nutrition_metrics_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_metrics',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: nutritionKeys.all });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(mealsChannel);
      supabase.removeChannel(metricsChannel);
    };
  }, [userId, queryClient]);
}

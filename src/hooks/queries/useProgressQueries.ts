import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ── Types ───────────────────────────────────────────────
export interface ExerciseProgressionData {
  exerciseName: string;
  dataPoints: Array<{ date: string; weight: number; reps: string; sets: number }>;
  latestWeight: number;
  initialWeight: number;
  weightChange: number;
  totalSessions: number;
}

interface NutritionDay {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: number;
}

export interface BodyCompositionEntry {
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
  muscle_mass_kg: number | null;
  water_pct: number | null;
  bmi: number | null;
  visceral_fat_index: number | null;
  lean_mass_kg: number | null;
  bone_mass_kg: number | null;
  bmr_kcal: number | null;
  body_age: number | null;
  protein_pct: number | null;
  protein_kg: number | null;
  subcutaneous_fat_pct: number | null;
  fat_mass_kg: number | null;
  skeletal_muscle_pct: number | null;
  standard_weight_kg: number | null;
}

interface WeightEntry {
  date: string;
  weight: number;
}

// ── Query keys ──────────────────────────────────────────
export const progressKeys = {
  all: ['progress'] as const,
  exerciseProgression: (userId: string) => [...progressKeys.all, 'exerciseProgression', userId] as const,
  nutritionHistory: (userId: string, days: number) => [...progressKeys.all, 'nutritionHistory', userId, days] as const,
  bodyComposition: (userId: string) => [...progressKeys.all, 'bodyComposition', userId] as const,
  weightHistory: (userId: string, days: number) => [...progressKeys.all, 'weightHistory', userId, days] as const,
};

// ── Helpers ─────────────────────────────────────────────
export function parseWeight(str: string | null): number | null {
  if (!str || str.trim() === '') return null;

  const cleaned = str.trim().toLowerCase();

  // Skip non-numeric descriptors
  if (
    cleaned === 'bodyweight' ||
    cleaned === 'poids du corps' ||
    cleaned === 'elastique' ||
    cleaned === 'bande' ||
    cleaned.includes('élastique') ||
    cleaned.includes('bande')
  ) {
    return null;
  }

  // Handle ranges like "30-40" → average
  const rangeMatch = cleaned.match(/^(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)$/);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1].replace(',', '.'));
    const high = parseFloat(rangeMatch[2].replace(',', '.'));
    if (!isNaN(low) && !isNaN(high)) {
      return (low + high) / 2;
    }
  }

  // Extract first number from the string
  const numMatch = cleaned.match(/(\d+(?:[.,]\d+)?)/);
  if (numMatch) {
    const val = parseFloat(numMatch[1].replace(',', '.'));
    if (!isNaN(val)) return val;
  }

  return null;
}

// ── useExerciseProgression ──────────────────────────────
export function useExerciseProgression(userId: string | undefined) {
  return useQuery({
    queryKey: progressKeys.exerciseProgression(userId ?? ''),
    queryFn: async (): Promise<ExerciseProgressionData[]> => {
      const { data, error } = await supabase
        .from('workout_exercise_logs')
        .select('exercise_name, actual_sets, actual_reps, actual_weight, created_at')
        .eq('user_id', userId!)
        .eq('skipped', false)
        .order('created_at', { ascending: true })
        .limit(500);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Group by exercise name (lowercase, trimmed)
      const exerciseMap = new Map<string, Array<{ date: string; weight: number; reps: string; sets: number }>>();

      for (const log of data) {
        const name = (log.exercise_name || '').trim().toLowerCase();
        if (!name) continue;

        const weight = parseWeight(log.actual_weight);
        if (weight === null) continue;

        const date = new Date(log.created_at).toISOString().split('T')[0];

        if (!exerciseMap.has(name)) {
          exerciseMap.set(name, []);
        }

        exerciseMap.get(name)!.push({
          date,
          weight,
          reps: log.actual_reps || '',
          sets: log.actual_sets || 0,
        });
      }

      // Build progression data, only include exercises with >= 2 data points
      const results: ExerciseProgressionData[] = [];

      for (const [name, dataPoints] of exerciseMap) {
        if (dataPoints.length < 2) continue;

        const initialWeight = dataPoints[0].weight;
        const latestWeight = dataPoints[dataPoints.length - 1].weight;
        const weightChange = initialWeight > 0
          ? Math.round(((latestWeight - initialWeight) / initialWeight) * 100)
          : 0;

        results.push({
          exerciseName: name,
          dataPoints,
          latestWeight,
          initialWeight,
          weightChange,
          totalSessions: dataPoints.length,
        });
      }

      // Sort by totalSessions descending
      results.sort((a, b) => b.totalSessions - a.totalSessions);

      return results;
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

// ── useNutritionHistory ─────────────────────────────────
export function useNutritionHistory(userId: string | undefined, days: number = 30) {
  return useQuery({
    queryKey: progressKeys.nutritionHistory(userId ?? '', days),
    queryFn: async (): Promise<NutritionDay[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString();

      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('calories, protein, carbs, fat, logged_at')
        .eq('user_id', userId!)
        .gte('logged_at', sinceStr);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Aggregate by day
      const dayMap = new Map<string, NutritionDay>();

      for (const log of data) {
        const date = new Date(log.logged_at).toISOString().split('T')[0];

        if (!dayMap.has(date)) {
          dayMap.set(date, { date, calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 });
        }

        const day = dayMap.get(date)!;
        day.calories += log.calories || 0;
        day.protein += log.protein || 0;
        day.carbs += log.carbs || 0;
        day.fat += log.fat || 0;
        day.meals += 1;
      }

      // Round values and sort by date ASC
      const result = Array.from(dayMap.values()).map(d => ({
        ...d,
        calories: Math.round(d.calories),
        protein: Math.round(d.protein),
        carbs: Math.round(d.carbs),
        fat: Math.round(d.fat),
      }));

      result.sort((a, b) => a.date.localeCompare(b.date));

      return result;
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}

// ── useBodyCompositionHistory ───────────────────────────
export function useBodyCompositionHistory(userId: string | undefined) {
  return useQuery({
    queryKey: progressKeys.bodyComposition(userId ?? ''),
    queryFn: async (): Promise<BodyCompositionEntry[]> => {
      const { data, error } = await supabase
        .from('body_composition')
        .select('measured_at, weight_kg, body_fat_pct, muscle_mass_kg, water_pct, bmi, visceral_fat_index, lean_mass_kg, bone_mass_kg, bmr_kcal, body_age, protein_pct, protein_kg, subcutaneous_fat_pct, fat_mass_kg, skeletal_muscle_pct, standard_weight_kg')
        .eq('user_id', userId!)
        .order('measured_at', { ascending: true })
        .limit(100);

      if (error) throw error;
      if (!data) return [];

      return data.map((row: any) => ({
        date: new Date(row.measured_at).toISOString().split('T')[0],
        weight_kg: row.weight_kg ?? null,
        body_fat_pct: row.body_fat_pct ?? null,
        muscle_mass_kg: row.muscle_mass_kg ?? null,
        water_pct: row.water_pct ?? null,
        bmi: row.bmi ?? null,
        visceral_fat_index: row.visceral_fat_index ?? null,
        lean_mass_kg: row.lean_mass_kg ?? null,
        bone_mass_kg: row.bone_mass_kg ?? null,
        bmr_kcal: row.bmr_kcal ?? null,
        body_age: row.body_age ?? null,
        protein_pct: row.protein_pct ?? null,
        protein_kg: row.protein_kg ?? null,
        subcutaneous_fat_pct: row.subcutaneous_fat_pct ?? null,
        fat_mass_kg: row.fat_mass_kg ?? null,
        skeletal_muscle_pct: row.skeletal_muscle_pct ?? null,
        standard_weight_kg: row.standard_weight_kg ?? null,
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}

// ── useWeightHistory ────────────────────────────────────
export function useWeightHistory(userId: string | undefined, days: number = 90) {
  return useQuery({
    queryKey: progressKeys.weightHistory(userId ?? '', days),
    queryFn: async (): Promise<WeightEntry[]> => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().split('T')[0];

      const [dailyRes, bodyRes] = await Promise.all([
        supabase
          .from('daily_metrics')
          .select('date, weight')
          .eq('user_id', userId!)
          .gte('date', sinceStr)
          .not('weight', 'is', null),
        supabase
          .from('body_composition')
          .select('measured_at, weight_kg')
          .eq('user_id', userId!)
          .gte('measured_at', `${sinceStr}T00:00:00`)
          .not('weight_kg', 'is', null),
      ]);

      if (dailyRes.error) throw dailyRes.error;
      if (bodyRes.error) throw bodyRes.error;

      // Build map by date, prefer body_composition weight if both exist
      const weightMap = new Map<string, number>();

      // Add daily_metrics entries first
      for (const row of dailyRes.data ?? []) {
        if (row.weight != null) {
          weightMap.set(row.date, row.weight);
        }
      }

      // Override with body_composition entries (preferred source)
      for (const row of bodyRes.data ?? []) {
        if (row.weight_kg != null) {
          const date = new Date(row.measured_at).toISOString().split('T')[0];
          weightMap.set(date, row.weight_kg);
        }
      }

      // Convert to sorted array
      const result: WeightEntry[] = Array.from(weightMap.entries())
        .map(([date, weight]) => ({ date, weight }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return result;
    },
    enabled: !!userId,
    staleTime: 5 * 60_000,
  });
}

// ── Realtime invalidation ───────────────────────────────
export function useProgressRealtimeInvalidation(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const exerciseLogsChannel = supabase
      .channel('progress_exercise_logs_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workout_exercise_logs',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: progressKeys.all });
      })
      .subscribe();

    const nutritionChannel = supabase
      .channel('progress_nutrition_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'nutrition_logs',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: progressKeys.all });
      })
      .subscribe();

    const bodyCompChannel = supabase
      .channel('progress_body_comp_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'body_composition',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: progressKeys.all });
      })
      .subscribe();

    const metricsChannel = supabase
      .channel('progress_metrics_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_metrics',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: progressKeys.all });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(exerciseLogsChannel);
      supabase.removeChannel(nutritionChannel);
      supabase.removeChannel(bodyCompChannel);
      supabase.removeChannel(metricsChannel);
    };
  }, [userId, queryClient]);
}

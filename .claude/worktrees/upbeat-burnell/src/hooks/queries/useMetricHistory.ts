import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ── Query keys ──────────────────────────────────────────
export const metricHistoryKeys = {
  all: ['metricHistory'] as const,
  metric: (userId: string, key: string, days: number) =>
    [...metricHistoryKeys.all, userId, key, days] as const,
};

// ── Column mapping ──────────────────────────────────────
const metricColumnMap: Record<string, string> = {
  sleep: 'sleep_hours',
  heartRate: 'heart_rate_avg',
  steps: 'steps',
  activeMinutes: 'active_minutes',
  weight: 'weight',
  water: 'water_ml',
};

// ── useMetricHistory ────────────────────────────────────
export function useMetricHistory(
  userId: string | undefined,
  metricKey: string,
  days: number = 7,
) {
  const column = metricColumnMap[metricKey];

  const query = useQuery({
    queryKey: metricHistoryKeys.metric(userId ?? '', metricKey, days),
    queryFn: async (): Promise<Array<{ date: string; value: number }>> => {
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_metrics')
        .select(`date, ${column}`)
        .eq('user_id', userId!)
        .gte('date', sinceStr)
        .order('date', { ascending: true });

      if (error) throw error;
      if (!data) return [];

      // Filter out null values and map to {date, value}
      return data
        .filter((row: Record<string, unknown>) => row[column] != null)
        .map((row: Record<string, unknown>) => ({
          date: row.date as string,
          value: row[column] as number,
        }));
    },
    enabled: !!userId && !!column,
    staleTime: 5 * 60_000,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
  };
}

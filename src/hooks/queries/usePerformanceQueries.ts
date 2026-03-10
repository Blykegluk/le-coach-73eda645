import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek } from 'date-fns';

export interface WeekActivity {
  activity_type: string;
  duration_min: number;
  calories_burned: number | null;
  performed_at: string;
}

export interface PerformanceStats {
  totalSessions: number;
  totalTimeMin: number;
  totalCalories: number;
  currentStreak: number;
  /** All streak dates (descending), for the detail sheet */
  streakDates: string[];
  /** This week's activities, for the detail sheets */
  weekActivities: WeekActivity[];
}

export const performanceKeys = {
  all: ['performance'] as const,
  stats: (userId: string) => [...performanceKeys.all, 'stats', userId] as const,
};

export function usePerformanceStats(userId: string | undefined) {
  return useQuery({
    queryKey: performanceKeys.stats(userId ?? ''),
    queryFn: async (): Promise<PerformanceStats> => {
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      const { data: activities, error } = await supabase
        .from('activities')
        .select('activity_type, duration_min, calories_burned, performed_at')
        .eq('user_id', userId!)
        .gte('performed_at', weekStart.toISOString())
        .lte('performed_at', weekEnd.toISOString())
        .order('performed_at', { ascending: false });

      if (error) throw error;
      if (!activities || activities.length === 0) {
        return { totalSessions: 0, totalTimeMin: 0, totalCalories: 0, currentStreak: 0, streakDates: [], weekActivities: [] };
      }

      const totalSessions = activities.length;
      const totalTimeMin = activities.reduce((sum, a) => sum + (a.duration_min || 0), 0);
      const totalCalories = activities.reduce((sum, a) => sum + (a.calories_burned || 0), 0);

      // Calculate streak (consecutive days with activities, looking at all-time data)
      const { data: allActivities } = await supabase
        .from('activities')
        .select('performed_at')
        .eq('user_id', userId!)
        .order('performed_at', { ascending: false })
        .limit(200);

      let streak = 0;
      const streakDates: string[] = [];
      if (allActivities && allActivities.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activityDates = [...new Set(
          allActivities.map(a => new Date(a.performed_at).toISOString().split('T')[0])
        )].sort().reverse();

        for (let i = 0; i < activityDates.length; i++) {
          const activityDate = new Date(activityDates[i]);
          const expectedDate = new Date(today);
          expectedDate.setDate(today.getDate() - i);

          if (activityDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
            streak++;
            streakDates.push(activityDates[i]);
          } else {
            break;
          }
        }
      }

      return {
        totalSessions,
        totalTimeMin,
        totalCalories,
        currentStreak: streak,
        streakDates,
        weekActivities: activities as WeekActivity[],
      };
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

/** Invalidate performance stats when the activities table changes */
export function usePerformanceRealtimeInvalidation(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('performance_activities_rt')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'activities',
        filter: `user_id=eq.${userId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: performanceKeys.all });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

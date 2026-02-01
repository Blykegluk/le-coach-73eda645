import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { dataManager } from '@/services/DataManager';
import type { DailyMetrics, NutritionLog, Activity } from '@/types/health';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

/**
 * Hook for accessing health data with real-time updates
 */
export function useHealthData() {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [todayMetrics, setTodayMetrics] = useState<DailyMetrics | null>(null);
  const [todayMeals, setTodayMeals] = useState<NutritionLog[]>([]);
  const [todayActivities, setTodayActivities] = useState<Activity[]>([]);

  // Get current user and initialize DataManager
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        dataManager.setUserId(user.id);
      }
      setIsLoading(false);
    };

    initUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id || null;
      setUserId(newUserId);
      dataManager.setUserId(newUserId);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!userId) return;

    const today = new Date().toISOString().split('T')[0];

    // Fetch daily metrics
    const { data: metrics } = await supabase
      .from('daily_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    setTodayMetrics(metrics as DailyMetrics | null);

    // Fetch today's meals
    const { data: meals } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('logged_at', `${today}T00:00:00`)
      .lt('logged_at', `${today}T23:59:59`)
      .order('logged_at', { ascending: true });

    setTodayMeals((meals as NutritionLog[]) || []);

    // Fetch today's activities
    const { data: activities } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .gte('performed_at', `${today}T00:00:00`)
      .lt('performed_at', `${today}T23:59:59`)
      .order('performed_at', { ascending: true });

    setTodayActivities((activities as Activity[]) || []);
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId, fetchData]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    const today = new Date().toISOString().split('T')[0];

    // Subscribe to daily_metrics changes
    const metricsChannel = supabase
      .channel('daily_metrics_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_metrics',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<DailyMetrics>) => {
          console.log('Daily metrics update:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as DailyMetrics;
            if (record.date === today) {
              setTodayMetrics(record);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to nutrition_logs changes
    const nutritionChannel = supabase
      .channel('nutrition_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nutrition_logs',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<NutritionLog>) => {
          console.log('Nutrition log update:', payload);
          if (payload.eventType === 'INSERT') {
            const record = payload.new as NutritionLog;
            setTodayMeals(prev => [...prev, record]);
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as { id: string };
            setTodayMeals(prev => prev.filter(m => m.id !== oldRecord.id));
          } else if (payload.eventType === 'UPDATE') {
            const record = payload.new as NutritionLog;
            setTodayMeals(prev => prev.map(m => m.id === record.id ? record : m));
          }
        }
      )
      .subscribe();

    // Subscribe to activities changes
    const activitiesChannel = supabase
      .channel('activities_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities',
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<Activity>) => {
          console.log('Activity update:', payload);
          if (payload.eventType === 'INSERT') {
            const record = payload.new as Activity;
            setTodayActivities(prev => [...prev, record]);
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as { id: string };
            setTodayActivities(prev => prev.filter(a => a.id !== oldRecord.id));
          } else if (payload.eventType === 'UPDATE') {
            const record = payload.new as Activity;
            setTodayActivities(prev => prev.map(a => a.id === record.id ? record : a));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(metricsChannel);
      supabase.removeChannel(nutritionChannel);
      supabase.removeChannel(activitiesChannel);
    };
  }, [userId]);

  // Calculate derived data
  const caloriesRemaining = todayMetrics 
    ? 2000 - (todayMetrics.calories_in || 0) // Default goal: 2000 kcal
    : 2000;

  const proteinTotal = todayMeals.reduce((sum, meal) => sum + (meal.protein || 0), 0);
  const carbsTotal = todayMeals.reduce((sum, meal) => sum + (meal.carbs || 0), 0);
  const fatTotal = todayMeals.reduce((sum, meal) => sum + (meal.fat || 0), 0);

  return {
    userId,
    isLoading,
    isAuthenticated: !!userId,
    todayMetrics,
    todayMeals,
    todayActivities,
    caloriesRemaining,
    macros: {
      protein: proteinTotal,
      carbs: carbsTotal,
      fat: fatTotal,
    },
    refetch: fetchData,
  };
}

export default useHealthData;

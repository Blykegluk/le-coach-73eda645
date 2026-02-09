import { supabase } from '@/integrations/supabase/client';
import type { HealthProvider, HealthMetrics, HealthDataPoint } from './HealthProvider';

/**
 * Supabase-based implementation of HealthProvider
 * This is the default provider that stores data in Supabase tables
 */
export class SupabaseHealthProvider implements HealthProvider {
  private userId: string | null = null;
  
  setUserId(userId: string | null) {
    this.userId = userId;
  }
  
  async getTodayMetrics(): Promise<HealthMetrics | null> {
    if (!this.userId) return null;
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('steps, sleep_hours, weight, water_ml, calories_in, calories_burned')
      .eq('user_id', this.userId)
      .eq('date', today)
      .maybeSingle();
    
    if (error || !data) return null;
    
    return {
      steps: data.steps,
      sleepHours: data.sleep_hours,
      weight: data.weight,
      waterMl: data.water_ml,
      caloriesIn: data.calories_in,
      caloriesBurned: data.calories_burned,
    };
  }
  
  async getWeightHistory(days: number): Promise<HealthDataPoint[]> {
    if (!this.userId) return [];
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('date, weight')
      .eq('user_id', this.userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .not('weight', 'is', null)
      .order('date', { ascending: true });
    
    if (error || !data) return [];
    
    return data
      .filter(d => d.weight !== null)
      .map(d => ({
        date: d.date,
        value: d.weight as number,
      }));
  }
  
  async getStepsHistory(days: number): Promise<HealthDataPoint[]> {
    if (!this.userId) return [];
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('daily_metrics')
      .select('date, steps')
      .eq('user_id', this.userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .not('steps', 'is', null)
      .order('date', { ascending: true });
    
    if (error || !data) return [];
    
    return data
      .filter(d => d.steps !== null)
      .map(d => ({
        date: d.date,
        value: d.steps as number,
      }));
  }
  
  subscribeToMetrics(callback: (metrics: HealthMetrics) => void): () => void {
    if (!this.userId) return () => {};
    
    const today = new Date().toISOString().split('T')[0];
    
    const channel = supabase
      .channel('health_metrics_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_metrics',
          filter: `user_id=eq.${this.userId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as {
              date: string;
              steps: number | null;
              sleep_hours: number | null;
              weight: number | null;
              water_ml: number | null;
              calories_in: number | null;
              calories_burned: number | null;
            };
            
            if (record.date === today) {
              callback({
                steps: record.steps,
                sleepHours: record.sleep_hours,
                weight: record.weight,
                waterMl: record.water_ml,
                caloriesIn: record.calories_in,
                caloriesBurned: record.calories_burned,
              });
            }
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }
  
  async isAvailable(): Promise<boolean> {
    // Supabase is always available if we have a user
    return this.userId !== null;
  }
  
  async requestPermissions(): Promise<boolean> {
    // No permissions needed for Supabase
    return true;
  }
}

// Singleton instance
export const supabaseHealthProvider = new SupabaseHealthProvider();

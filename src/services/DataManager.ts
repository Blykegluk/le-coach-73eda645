import { supabase } from '@/integrations/supabase/client';
import type { 
  DailyMetrics, 
  NutritionLog, 
  Activity, 
  UserContext,
  LogMealInput,
  LogActivityInput,
  MealType
} from '@/types/health';

/**
 * DataManager - Central service for all health data operations
 * Provides methods to log meals, activities, update metrics, and sync data
 */
class DataManager {
  private userId: string | null = null;

  /**
   * Set the current user ID
   */
  setUserId(userId: string | null) {
    this.userId = userId;
  }

  /**
   * Get the current user ID
   */
  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Get today's date in YYYY-MM-DD format
   */
  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Get or create today's daily metrics record
   */
  async getOrCreateTodayMetrics(): Promise<DailyMetrics | null> {
    if (!this.userId) return null;

    const today = this.getTodayDate();
    
    // Try to get existing record
    const { data: existing, error: fetchError } = await supabase
      .from('daily_metrics')
      .select('*')
      .eq('user_id', this.userId)
      .eq('date', today)
      .maybeSingle();

    if (existing) return existing as DailyMetrics;

    // Create new record if not exists
    if (!existing) {
      const { data: created, error: createError } = await supabase
        .from('daily_metrics')
        .insert({
          user_id: this.userId,
          date: today,
          steps: 0,
          sleep_hours: 0,
          water_ml: 0,
          calories_in: 0,
          calories_burned: 0,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating daily metrics:', createError);
        return null;
      }

      return created as DailyMetrics;
    }

    if (fetchError) {
      console.error('Error fetching daily metrics:', fetchError);
      return null;
    }

    return null;
  }

  /**
   * Get today's daily metrics
   */
  async getTodayMetrics(): Promise<DailyMetrics | null> {
    if (!this.userId) return null;

    const { data, error } = await supabase
      .from('daily_metrics')
      .select('*')
      .eq('user_id', this.userId)
      .eq('date', this.getTodayDate())
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching today metrics:', error);
    }

    return data as DailyMetrics | null;
  }

  /**
   * Log a meal and update daily calories
   */
  async logMeal(input: LogMealInput): Promise<NutritionLog | null> {
    if (!this.userId) {
      console.error('No user ID set');
      return null;
    }

    // Ensure we have today's metrics record
    const metrics = await this.getOrCreateTodayMetrics();
    if (!metrics) {
      console.error('Could not get or create daily metrics');
      return null;
    }

    // Insert nutrition log
    const { data: log, error: logError } = await supabase
      .from('nutrition_logs')
      .insert([{
        user_id: this.userId,
        meal_type: input.meal_type,
        food_name: input.food_name,
        calories: input.calories,
        protein: input.protein || 0,
        carbs: input.carbs || 0,
        fat: input.fat || 0,
        photo_url: input.photo_url || null,
        ai_analysis_json: input.ai_analysis_json ? JSON.parse(JSON.stringify(input.ai_analysis_json)) : null,
      }])
      .select()
      .single();

    if (logError) {
      console.error('Error logging meal:', logError);
      return null;
    }

    // Update daily calories_in
    const newCaloriesIn = (metrics.calories_in || 0) + input.calories;
    const { error: updateError } = await supabase
      .from('daily_metrics')
      .update({ calories_in: newCaloriesIn })
      .eq('id', metrics.id);

    if (updateError) {
      console.error('Error updating daily calories:', updateError);
    }

    return log as NutritionLog;
  }

  /**
   * Add water intake
   */
  async addWater(amountMl: number): Promise<boolean> {
    if (!this.userId) return false;

    const metrics = await this.getOrCreateTodayMetrics();
    if (!metrics) return false;

    const newWater = (metrics.water_ml || 0) + amountMl;
    const { error } = await supabase
      .from('daily_metrics')
      .update({ water_ml: newWater })
      .eq('id', metrics.id);

    if (error) {
      console.error('Error adding water:', error);
      return false;
    }

    return true;
  }

  /**
   * Update weight
   */
  async updateWeight(weightKg: number): Promise<boolean> {
    if (!this.userId) return false;

    const metrics = await this.getOrCreateTodayMetrics();
    if (!metrics) return false;

    const { error } = await supabase
      .from('daily_metrics')
      .update({ weight: weightKg })
      .eq('id', metrics.id);

    if (error) {
      console.error('Error updating weight:', error);
      return false;
    }

    return true;
  }

  /**
   * Update steps
   */
  async updateSteps(steps: number): Promise<boolean> {
    if (!this.userId) return false;

    const metrics = await this.getOrCreateTodayMetrics();
    if (!metrics) return false;

    const { error } = await supabase
      .from('daily_metrics')
      .update({ steps })
      .eq('id', metrics.id);

    if (error) {
      console.error('Error updating steps:', error);
      return false;
    }

    return true;
  }

  /**
   * Log an activity
   */
  async logActivity(input: LogActivityInput): Promise<Activity | null> {
    if (!this.userId) return null;

    const metrics = await this.getOrCreateTodayMetrics();
    if (!metrics) return null;

    // Insert activity
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        user_id: this.userId,
        activity_type: input.activity_type,
        duration_min: input.duration_min,
        avg_heart_rate: input.avg_heart_rate,
        calories_burned: input.calories_burned || 0,
        notes: input.notes,
      })
      .select()
      .single();

    if (activityError) {
      console.error('Error logging activity:', activityError);
      return null;
    }

    // Update daily calories_burned
    if (input.calories_burned) {
      const newCaloriesBurned = (metrics.calories_burned || 0) + input.calories_burned;
      await supabase
        .from('daily_metrics')
        .update({ calories_burned: newCaloriesBurned })
        .eq('id', metrics.id);
    }

    return activity as Activity;
  }

  /**
   * Set user context (preferences, constraints, etc.)
   */
  async setContext(key: string, value: string): Promise<boolean> {
    if (!this.userId) return false;

    const { error } = await supabase
      .from('user_context')
      .upsert(
        {
          user_id: this.userId,
          key,
          value,
        },
        { onConflict: 'user_id,key' }
      );

    if (error) {
      console.error('Error setting context:', error);
      return false;
    }

    return true;
  }

  /**
   * Get all user context
   */
  async getContext(): Promise<UserContext[]> {
    if (!this.userId) return [];

    const { data, error } = await supabase
      .from('user_context')
      .select('*')
      .eq('user_id', this.userId);

    if (error) {
      console.error('Error fetching context:', error);
      return [];
    }

    return data as UserContext[];
  }

  /**
   * Get today's nutrition logs
   */
  async getTodayNutritionLogs(): Promise<NutritionLog[]> {
    if (!this.userId) return [];

    const today = this.getTodayDate();
    const { data, error } = await supabase
      .from('nutrition_logs')
      .select('*')
      .eq('user_id', this.userId)
      .gte('logged_at', `${today}T00:00:00`)
      .lt('logged_at', `${today}T23:59:59`)
      .order('logged_at', { ascending: true });

    if (error) {
      console.error('Error fetching nutrition logs:', error);
      return [];
    }

    return data as NutritionLog[];
  }

  /**
   * Get daily summary for AI context
   */
  async getDailySummary(): Promise<{
    metrics: DailyMetrics | null;
    meals: NutritionLog[];
    context: UserContext[];
  }> {
    const [metrics, meals, context] = await Promise.all([
      this.getTodayMetrics(),
      this.getTodayNutritionLogs(),
      this.getContext(),
    ]);

    return { metrics, meals, context };
  }

  /**
   * Sync health data from external sources (mock for now)
   */
  async syncHealthData(data: {
    steps?: number;
    sleep_hours?: number;
    calories_burned?: number;
  }): Promise<boolean> {
    if (!this.userId) return false;

    const metrics = await this.getOrCreateTodayMetrics();
    if (!metrics) return false;

    const updates: Partial<DailyMetrics> = {};
    if (data.steps !== undefined) updates.steps = data.steps;
    if (data.sleep_hours !== undefined) updates.sleep_hours = data.sleep_hours;
    if (data.calories_burned !== undefined) {
      updates.calories_burned = (metrics.calories_burned || 0) + data.calories_burned;
    }

    if (Object.keys(updates).length === 0) return true;

    const { error } = await supabase
      .from('daily_metrics')
      .update(updates)
      .eq('id', metrics.id);

    if (error) {
      console.error('Error syncing health data:', error);
      return false;
    }

    return true;
  }
}

// Singleton instance
export const dataManager = new DataManager();
export default dataManager;

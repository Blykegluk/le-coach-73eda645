/**
 * Abstract Health Provider Interface
 * 
 * This interface abstracts health data access to allow multiple implementations:
 * - SupabaseHealthProvider: Current implementation using Supabase as source
 * - NativeHealthProvider: Future implementation for Health Connect (Android) / HealthKit (iOS)
 */

export interface HealthMetrics {
  steps: number | null;
  sleepHours: number | null;
  weight: number | null;
  waterMl: number | null;
  caloriesIn: number | null;
  caloriesBurned: number | null;
}

export interface HealthDataPoint {
  date: string;
  value: number;
}

export interface HealthProvider {
  /**
   * Get today's health metrics
   */
  getTodayMetrics(): Promise<HealthMetrics | null>;
  
  /**
   * Get weight history for chart display
   */
  getWeightHistory(days: number): Promise<HealthDataPoint[]>;
  
  /**
   * Get steps history
   */
  getStepsHistory(days: number): Promise<HealthDataPoint[]>;
  
  /**
   * Subscribe to real-time metric updates
   */
  subscribeToMetrics(callback: (metrics: HealthMetrics) => void): () => void;
  
  /**
   * Check if the provider is available (e.g., Health Connect permissions)
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Request necessary permissions
   */
  requestPermissions(): Promise<boolean>;
}

export type HealthProviderType = 'supabase' | 'native';

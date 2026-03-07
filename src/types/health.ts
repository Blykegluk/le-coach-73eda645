// Types for the health data model

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface DailyMetrics {
  id: string;
  user_id: string;
  date: string;
  steps: number;
  sleep_hours: number;
  weight: number | null;
  water_ml: number;
  calories_in: number;
  calories_burned: number;
  created_at: string;
  updated_at: string;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  logged_at: string;
  meal_type: MealType;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  photo_url: string | null;
  ai_analysis_json: Record<string, unknown> | null;
  created_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  performed_at: string;
  activity_type: string;
  duration_min: number;
  avg_heart_rate: number | null;
  calories_burned: number;
  notes: string | null;
  created_at: string;
}

export interface UserContext {
  id: string;
  user_id: string;
  key: string;
  value: string;
  created_at: string;
  updated_at: string;
}

// AI Coach Action Types
export type CoachActionType = 
  | 'LOG_FOOD'
  | 'LOG_WATER'
  | 'LOG_WEIGHT'
  | 'LOG_ACTIVITY'
  | 'UPDATE_STEPS'
  | 'SET_CONTEXT'
  | 'GET_SUMMARY'
  | 'NONE';

export interface LogFoodData {
  food_name: string;
  meal_type: MealType;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface LogWaterData {
  amount_ml: number;
}

export interface LogWeightData {
  weight_kg: number;
}

export interface LogActivityData {
  activity_type: string;
  duration_min: number;
  calories_burned?: number;
}

export interface UpdateStepsData {
  steps: number;
}

export interface SetContextData {
  key: string;
  value: string;
}

export interface CoachAction {
  action: CoachActionType;
  data: LogFoodData | LogWaterData | LogWeightData | LogActivityData | UpdateStepsData | SetContextData | null;
  response: string;
}


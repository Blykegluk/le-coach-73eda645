export interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  // Optional for now (not present in current DB schema)
  last_name?: string | null;
  avatar_url?: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  birth_date: string | null;
  gender: 'male' | 'female' | 'other' | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;
  goal: 'weight_loss' | 'fat_loss' | 'muscle_gain' | 'maintain' | 'recomposition' | 'wellness' | null;
  target_weight_kg: number | null;
  weekly_goal_kg: number | null;
  target_calories: number | null;
  target_steps: number | null;
  target_water_ml: number | null;
  target_sleep_hours: number | null;
  current_body_fat_pct: number | null;
  target_body_fat_pct: number | null;
  dietary_preferences: string[] | null;
  allergies: string | null;
  notifications_enabled: boolean | null;
  onboarding_complete: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingData {
  // Step 1: Personal info
  birth_date: string;
  gender: 'male' | 'female' | 'other';
  height: number;
  first_name: string;
  
  // Step 2: Current situation
  weight: number;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  
  // Step 3: Goal
  goal: 'weight_loss' | 'fat_loss' | 'muscle_gain' | 'maintain' | 'recomposition' | 'wellness';
  target_weight?: number;
}

export function isProfileComplete(profile: Partial<Profile> | null): boolean {
  if (!profile) return false;
  
  return !!(
    profile.height_cm &&
    profile.weight_kg &&
    profile.birth_date &&
    profile.gender &&
    profile.activity_level &&
    profile.goal
  );
}

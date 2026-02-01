export interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  height: number | null;
  weight: number | null;
  birth_date: string | null;
  gender: 'male' | 'female' | 'other' | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;
  goal: 'weight_loss' | 'fat_loss' | 'muscle_gain' | 'maintain' | 'recomposition' | 'wellness' | null;
  target_weight: number | null;
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
    profile.height &&
    profile.weight &&
    profile.birth_date &&
    profile.gender &&
    profile.activity_level &&
    profile.goal
  );
}

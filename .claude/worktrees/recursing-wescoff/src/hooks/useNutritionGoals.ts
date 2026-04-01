import { useMemo } from 'react';

interface Profile {
  weight_kg?: number | null;
  height_cm?: number | null;
  birth_date?: string | null;
  gender?: string | null;
  activity_level?: string | null;
  goal?: string | null;
}

export interface NutritionGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  hydrationLiters: number;
}

/**
 * Calculate daily nutrition goals based on profile using Harris-Benedict formula
 */
export function calculateNutritionGoals(profile: Profile | null): NutritionGoals {
  const defaults: NutritionGoals = {
    calories: 2000,
    protein: 100,
    carbs: 250,
    fat: 65,
    hydrationLiters: 2.5,
  };

  if (!profile?.weight_kg || !profile?.height_cm) return defaults;

  const weight = profile.weight_kg;
  const height = profile.height_cm;
  const age = profile.birth_date 
    ? Math.floor((Date.now() - new Date(profile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 30;
  
  // BMR calculation (Mifflin-St Jeor)
  let bmr: number;
  if (profile.gender === 'male') {
    bmr = 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age);
  } else {
    bmr = 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  }

  // Activity multiplier
  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
    athlete: 1.9,
  };
  const multiplier = activityMultipliers[profile.activity_level || 'moderate'] || 1.55;
  
  let tdee = Math.round(bmr * multiplier);

  // Adjust for goal
  if (profile.goal === 'weight_loss' || profile.goal === 'fat_loss') {
    tdee = Math.round(tdee * 0.85); // 15% deficit
  } else if (profile.goal === 'muscle_gain') {
    tdee = Math.round(tdee * 1.1); // 10% surplus
  }

  // Macro split (protein: 2g/kg, rest balanced)
  const proteinGoal = Math.round(weight * 2);
  const proteinCals = proteinGoal * 4;
  const fatGoal = Math.round((tdee * 0.25) / 9);
  const fatCals = fatGoal * 9;
  const carbGoal = Math.round((tdee - proteinCals - fatCals) / 4);

  return {
    calories: tdee,
    protein: proteinGoal,
    carbs: carbGoal,
    fat: fatGoal,
    hydrationLiters: Math.round(weight * 0.033 * 10) / 10,
  };
}

/**
 * Hook to get nutrition goals based on user profile
 */
export function useNutritionGoals(profile: Profile | null): NutritionGoals {
  return useMemo(() => calculateNutritionGoals(profile), [profile]);
}

import { Coffee, UtensilsCrossed, Moon, Apple, Cake } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Returns the appropriate icon component for a meal type.
 */
export function getMealIcon(mealType: string): LucideIcon {
  switch (mealType) {
    case 'breakfast':
      return Coffee;
    case 'lunch':
      return UtensilsCrossed;
    case 'dinner':
      return Moon;
    case 'morning_snack':
    case 'afternoon_snack':
    case 'snack':
      return Apple;
    case 'dessert':
      return Cake;
    default:
      return UtensilsCrossed;
  }
}

/**
 * Returns Tailwind classes for text and background colors based on meal type.
 * These use design tokens from index.css (energy, water, sleep, calories, primary).
 */
export function getMealColorClasses(mealType: string): string {
  switch (mealType) {
    case 'breakfast':
      // Warm orange/energy color for breakfast
      return 'text-energy bg-energy/10';
    case 'lunch':
      // Primary teal for lunch
      return 'text-primary bg-primary/10';
    case 'dinner':
      // Purple/sleep color for dinner
      return 'text-sleep bg-sleep/10';
    case 'morning_snack':
    case 'afternoon_snack':
    case 'snack':
      // Blue/water color for snacks
      return 'text-water bg-water/10';
    case 'dessert':
      // Red/calories color for dessert
      return 'text-calories bg-calories/10';
    default:
      return 'text-primary bg-primary/10';
  }
}

/**
 * Returns just the text color class for a meal type.
 */
export function getMealTextColor(mealType: string): string {
  switch (mealType) {
    case 'breakfast':
      return 'text-energy';
    case 'lunch':
      return 'text-primary';
    case 'dinner':
      return 'text-sleep';
    case 'morning_snack':
    case 'afternoon_snack':
    case 'snack':
      return 'text-water';
    case 'dessert':
      return 'text-calories';
    default:
      return 'text-primary';
  }
}

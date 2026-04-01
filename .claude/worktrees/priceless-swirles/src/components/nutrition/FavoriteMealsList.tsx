import { Star, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';
import { useFavoriteMeals, useRemoveFavoriteMeal, type FavoriteMeal } from '@/hooks/queries/useFavoriteMeals';
import { nutritionKeys } from '@/hooks/queries/useNutritionQueries';
import { useQueryClient } from '@tanstack/react-query';

interface FavoriteMealsListProps {
  userId: string;
  mealType: string;
  onClose: () => void;
}

export default function FavoriteMealsList({ userId, mealType, onClose }: FavoriteMealsListProps) {
  const { data: favorites = [], isLoading } = useFavoriteMeals(userId);
  const removeFavorite = useRemoveFavoriteMeal();
  const queryClient = useQueryClient();
  const [inserting, setInserting] = useState<string | null>(null);

  const insertFavorite = async (fav: FavoriteMeal) => {
    setInserting(fav.id);
    try {
      const { error } = await supabase.from('nutrition_logs').insert({
        user_id: userId,
        meal_type: mealType,
        food_name: fav.food_name,
        calories: fav.calories,
        protein: fav.protein,
        carbs: fav.carbs,
        fat: fav.fat,
        logged_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success('Repas ajouté !');
      queryClient.invalidateQueries({ queryKey: nutritionKeys.all });
      onClose();
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setInserting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Star className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">Aucun favori pour le moment</p>
        <p className="text-xs text-muted-foreground mt-1">
          Enregistre un repas puis ajoute-le en favori depuis le détail
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {favorites.map(fav => (
        <div
          key={fav.id}
          className="flex items-center justify-between p-3 rounded-xl border border-border bg-card cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => insertFavorite(fav)}
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground text-sm truncate">{fav.food_name}</p>
            <p className="text-xs text-muted-foreground">
              {fav.calories} kcal · {Math.round(fav.protein)}g P · {Math.round(fav.carbs)}g G · {Math.round(fav.fat)}g L
            </p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {inserting === fav.id && <Loader2 className="h-4 w-4 animate-spin" />}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeFavorite.mutate(fav.id);
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FavoriteMeal {
  id: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meal_type: string | null;
}

const favoriteKeys = {
  all: ['favoriteMeals'] as const,
  list: (userId: string) => [...favoriteKeys.all, userId] as const,
};

export function useFavoriteMeals(userId: string | undefined) {
  return useQuery({
    queryKey: favoriteKeys.list(userId ?? ''),
    queryFn: async (): Promise<FavoriteMeal[]> => {
      const { data, error } = await supabase
        .from('favorite_meals')
        .select('id, food_name, calories, protein, carbs, fat, meal_type')
        .eq('user_id', userId!)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
}

export function useAddFavoriteMeal(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meal: Omit<FavoriteMeal, 'id'>) => {
      const { error } = await supabase
        .from('favorite_meals')
        .insert({ ...meal, user_id: userId! });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.all });
      toast.success('Ajouté aux favoris');
    },
    onError: () => {
      toast.error('Erreur lors de l\'ajout aux favoris');
    },
  });
}

export function useRemoveFavoriteMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('favorite_meals')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: favoriteKeys.all });
      toast.success('Retiré des favoris');
    },
  });
}

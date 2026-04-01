import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { nutritionKeys } from '@/hooks/queries/useNutritionQueries';
import { useQueryClient } from '@tanstack/react-query';

interface FoodSearchResult {
  name: string;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
}

interface FoodSearchSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  mealType: string;
}

export default function FoodSearchSheet({ isOpen, onClose, userId, mealType }: FoodSearchSheetProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [inserting, setInserting] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query.trim())}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,brands,nutriments,serving_size`;
        const res = await fetch(url);
        const data = await res.json();

        const mapped: FoodSearchResult[] = (data.products || [])
          .filter((p: any) => p.product_name && p.nutriments)
          .map((p: any) => ({
            name: p.product_name,
            brand: p.brands || null,
            calories: Math.round(p.nutriments['energy-kcal_100g'] || p.nutriments['energy-kcal'] || 0),
            protein: Math.round((p.nutriments.proteins_100g || 0) * 10) / 10,
            carbs: Math.round((p.nutriments.carbohydrates_100g || 0) * 10) / 10,
            fat: Math.round((p.nutriments.fat_100g || 0) * 10) / 10,
            servingSize: p.serving_size || '100g',
          }));

        setResults(mapped);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const addFood = async (food: FoodSearchResult, index: number) => {
    setInserting(index);
    try {
      const displayName = food.brand ? `${food.name} (${food.brand})` : food.name;
      const { error } = await supabase.from('nutrition_logs').insert({
        user_id: userId,
        meal_type: mealType,
        food_name: displayName,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        logged_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success(`${food.name} ajouté !`);
      queryClient.invalidateQueries({ queryKey: nutritionKeys.all });
      onClose();
    } catch {
      toast.error("Erreur lors de l'ajout");
    } finally {
      setInserting(null);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Rechercher un aliment</SheetTitle>
        </SheetHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ex: pâtes, yaourt, pomme..."
            className="pl-10"
            autoFocus
          />
        </div>

        {isSearching && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isSearching && query.trim().length >= 2 && results.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">
            Aucun résultat pour "{query}"
          </p>
        )}

        <div className="space-y-2">
          {results.map((food, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-xl border border-border bg-card"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{food.name}</p>
                {food.brand && (
                  <p className="text-xs text-muted-foreground truncate">{food.brand}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {food.calories} kcal · {food.protein}g P · {food.carbs}g G · {food.fat}g L
                  <span className="text-muted-foreground/60"> /100g</span>
                </p>
              </div>
              <button
                onClick={() => addFood(food, i)}
                disabled={inserting === i}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-primary/10 hover:border-primary transition-all active:scale-95 disabled:opacity-50 ml-2"
              >
                {inserting === i ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4 pb-2">
          Données : Open Food Facts
        </p>
      </SheetContent>
    </Sheet>
  );
}

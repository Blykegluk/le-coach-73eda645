import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Flame, Beef, Wheat, Droplet, Pencil, Trash2, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAddFavoriteMeal } from '@/hooks/queries/useFavoriteMeals';

interface NutritionLog {
  id: string;
  meal_type?: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_at: string;
}

interface MealDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  mealName: string;
  logs: NutritionLog[];
  onChanged?: () => void;
}

const MEAL_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'breakfast', label: 'Petit-déjeuner' },
  { value: 'morning_snack', label: 'Collation' },
  { value: 'lunch', label: 'Déjeuner' },
  { value: 'afternoon_snack', label: 'Goûter' },
  { value: 'dinner', label: 'Dîner' },
  { value: 'dessert', label: 'Dessert' },
];

function getTimeHHMM(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return '12:00';
  }
}

function getDatePart(iso: string): string {
  const str = String(iso);
  if (str.includes('T')) return str.split('T')[0];
  try {
    return new Date(iso).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

const MealDetailSheet = ({ isOpen, onClose, mealName, logs, onChanged }: MealDetailSheetProps) => {
  const { user } = useAuth();
  const addFavorite = useAddFavoriteMeal(user?.id);
  const [editing, setEditing] = useState<NutritionLog | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    food_name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    meal_type: 'lunch',
    time: '12:00',
  });

  const totals = useMemo(
    () =>
      logs.reduce(
        (acc, log) => ({
          calories: acc.calories + (log.calories || 0),
          protein: acc.protein + (log.protein || 0),
          carbs: acc.carbs + (log.carbs || 0),
          fat: acc.fat + (log.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      ),
    [logs]
  );

  useEffect(() => {
    if (!editing) return;
    setForm({
      food_name: editing.food_name || '',
      calories: String(editing.calories ?? 0),
      protein: String(editing.protein ?? 0),
      carbs: String(editing.carbs ?? 0),
      fat: String(editing.fat ?? 0),
      meal_type: editing.meal_type || 'lunch',
      time: getTimeHHMM(editing.logged_at),
    });
  }, [editing]);

  const saveEdit = async () => {
    if (!editing) return;
    setIsSaving(true);
    try {
      const datePart = getDatePart(editing.logged_at);
      const loggedAt = `${datePart}T${form.time}:00`;

      const { error } = await supabase
        .from('nutrition_logs')
        .update({
          food_name: form.food_name.trim() || editing.food_name,
          calories: Math.round(Number(form.calories) || 0),
          protein: Number(form.protein) || 0,
          carbs: Number(form.carbs) || 0,
          fat: Number(form.fat) || 0,
          meal_type: form.meal_type,
          logged_at: loggedAt,
        })
        .eq('id', editing.id);

      if (error) throw error;

      toast.success('Aliment mis à jour');
      setEditing(null);
      onChanged?.();
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Impossible de modifier l'aliment.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteLog = async (logId: string) => {
    try {
      const { error } = await supabase.from('nutrition_logs').delete().eq('id', logId);
      if (error) throw error;

      toast.success('Aliment supprimé');
      onChanged?.();
    } catch (e: unknown) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Impossible de supprimer l'aliment.");
    }
  };

  const macros = [
    { name: 'Calories', value: Math.round(totals.calories), unit: 'kcal', icon: Flame, color: 'text-orange-500 bg-orange-100 dark:bg-orange-900/30' },
    { name: 'Protéines', value: Math.round(totals.protein), unit: 'g', icon: Beef, color: 'text-red-500 bg-red-100 dark:bg-red-900/30' },
    { name: 'Glucides', value: Math.round(totals.carbs), unit: 'g', icon: Wheat, color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30' },
    { name: 'Lipides', value: Math.round(totals.fat), unit: 'g', icon: Droplet, color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30' },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-xl">{mealName}</SheetTitle>
        </SheetHeader>

        {/* Macros Summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {macros.map((macro) => {
            const Icon = macro.icon;
            return (
              <div key={macro.name} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full ${macro.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{macro.name}</p>
                    <p className="text-lg font-bold text-foreground">
                      {macro.value}
                      <span className="text-sm font-normal text-muted-foreground ml-1">{macro.unit}</span>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Food Items */}
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Aliments</p>
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-border bg-muted/50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground mb-2">{log.food_name}</p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => addFavorite.mutate({
                        food_name: log.food_name,
                        calories: log.calories || 0,
                        protein: log.protein || 0,
                        carbs: log.carbs || 0,
                        fat: log.fat || 0,
                        meal_type: log.meal_type || null,
                      })}
                      aria-label="Ajouter aux favoris"
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setEditing(log)}
                      aria-label="Modifier"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer cet aliment ?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Cette action est définitive.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteLog(log.id)}
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-orange-500" />
                    {log.calories || 0} kcal
                  </span>
                  <span className="flex items-center gap-1">
                    <Beef className="h-3 w-3 text-red-500" />
                    {Math.round(log.protein || 0)}g
                  </span>
                  <span className="flex items-center gap-1">
                    <Wheat className="h-3 w-3 text-amber-500" />
                    {Math.round(log.carbs || 0)}g
                  </span>
                  <span className="flex items-center gap-1">
                    <Droplet className="h-3 w-3 text-blue-500" />
                    {Math.round(log.fat || 0)}g
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Edit dialog */}
        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier un aliment</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="food_name">Nom</Label>
                <Input
                  id="food_name"
                  value={form.food_name}
                  onChange={(e) => setForm((s) => ({ ...s, food_name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="meal_type">Repas</Label>
                  <select
                    id="meal_type"
                    value={form.meal_type}
                    onChange={(e) => setForm((s) => ({ ...s, meal_type: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {MEAL_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="time">Heure</Label>
                  <Input
                    id="time"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((s) => ({ ...s, time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="calories">Calories (kcal)</Label>
                  <Input
                    id="calories"
                    inputMode="numeric"
                    value={form.calories}
                    onChange={(e) => setForm((s) => ({ ...s, calories: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="protein">Protéines (g)</Label>
                  <Input
                    id="protein"
                    inputMode="decimal"
                    value={form.protein}
                    onChange={(e) => setForm((s) => ({ ...s, protein: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="carbs">Glucides (g)</Label>
                  <Input
                    id="carbs"
                    inputMode="decimal"
                    value={form.carbs}
                    onChange={(e) => setForm((s) => ({ ...s, carbs: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="fat">Lipides (g)</Label>
                  <Input
                    id="fat"
                    inputMode="decimal"
                    value={form.fat}
                    onChange={(e) => setForm((s) => ({ ...s, fat: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={isSaving}>
                Annuler
              </Button>
              <Button type="button" onClick={saveEdit} disabled={isSaving}>
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
};

export default MealDetailSheet;

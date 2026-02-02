import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Flame, Beef, Wheat, Droplet } from 'lucide-react';

interface NutritionLog {
  id: string;
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
}

const MealDetailSheet = ({ isOpen, onClose, mealName, logs }: MealDetailSheetProps) => {
  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein || 0),
      carbs: acc.carbs + (log.carbs || 0),
      fat: acc.fat + (log.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

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
                <p className="font-medium text-foreground mb-2">{log.food_name}</p>
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
      </SheetContent>
    </Sheet>
  );
};

export default MealDetailSheet;

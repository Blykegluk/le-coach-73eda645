import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Utensils, Droplets } from 'lucide-react';
import { format, subDays, addDays, isToday, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface NutritionLog {
  id: string;
  meal_type: string;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_at: string;
}

interface DaySummary {
  date: Date;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
  logs: NutritionLog[];
}

interface NutritionHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  waterGoal: number;
}

const MEAL_NAMES: Record<string, string> = {
  breakfast: 'Petit-déjeuner',
  morning_snack: 'Collation matin',
  lunch: 'Déjeuner',
  afternoon_snack: 'Goûter',
  dinner: 'Dîner',
  dessert: 'Dessert',
  snack: 'Collation',
};

const NutritionHistorySheet = ({
  isOpen,
  onClose,
  calorieGoal,
  proteinGoal,
  carbsGoal,
  fatGoal,
  waterGoal,
}: NutritionHistorySheetProps) => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDayData = async () => {
      if (!user || !isOpen) return;
      
      setIsLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      // Fetch nutrition logs and water in parallel
      const [logsRes, metricsRes] = await Promise.all([
        supabase
          .from('nutrition_logs')
          .select('*')
          .eq('user_id', user.id)
          .gte('logged_at', `${dateStr}T00:00:00`)
          .lte('logged_at', `${dateStr}T23:59:59`)
          .order('logged_at', { ascending: true }),
        supabase
          .from('daily_metrics')
          .select('water_ml')
          .eq('user_id', user.id)
          .eq('date', dateStr)
          .maybeSingle(),
      ]);

      const logs = (logsRes.data || []) as NutritionLog[];
      const totals = logs.reduce(
        (acc, log) => ({
          calories: acc.calories + (log.calories || 0),
          protein: acc.protein + (log.protein || 0),
          carbs: acc.carbs + (log.carbs || 0),
          fat: acc.fat + (log.fat || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      setDaySummary({
        date: selectedDate,
        ...totals,
        waterMl: metricsRes.data?.water_ml || 0,
        logs,
      });
      setIsLoading(false);
    };

    fetchDayData();
  }, [user, selectedDate, isOpen]);

  const navigatePrev = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const navigateNext = () => {
    if (!isToday(selectedDate)) {
      setSelectedDate(addDays(selectedDate, 1));
    }
  };

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return "Aujourd'hui";
    if (isSameDay(date, subDays(new Date(), 1))) return 'Hier';
    return format(date, 'EEEE d MMMM', { locale: fr });
  };

  // Group logs by meal type
  const groupedLogs = daySummary?.logs.reduce((acc, log) => {
    const type = log.meal_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(log);
    return acc;
  }, {} as Record<string, NutritionLog[]>) || {};

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Historique nutrition
          </SheetTitle>
        </SheetHeader>

        {/* Date navigation */}
        <div className="flex items-center justify-between py-3 border-b border-border mb-4">
          <button
            onClick={navigatePrev}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <span className="text-sm font-medium text-foreground capitalize">
            {getDateLabel(selectedDate)}
          </span>
          
          <button
            onClick={navigateNext}
            disabled={isToday(selectedDate)}
            className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <ScrollArea className="h-[calc(85vh-140px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : daySummary ? (
            <div className="space-y-4 pr-4">
              {/* Summary card */}
              <div className="card-premium p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Calories</p>
                    <p className="text-xl font-bold text-foreground">
                      {daySummary.calories}
                      <span className="text-sm font-normal text-muted-foreground">/{calorieGoal}</span>
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted mt-2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary-glow transition-all"
                        style={{ width: `${Math.min((daySummary.calories / calorieGoal) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Hydratation</p>
                    <p className="text-xl font-bold text-foreground">
                      {(daySummary.waterMl / 1000).toFixed(1)}L
                      <span className="text-sm font-normal text-muted-foreground">/{waterGoal}L</span>
                    </p>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted mt-2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-water to-water/70 transition-all"
                        style={{ width: `${Math.min((daySummary.waterMl / 1000 / waterGoal) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Macros */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Protéines</p>
                    <p className="font-semibold text-foreground">
                      {Math.round(daySummary.protein)}
                      <span className="text-xs font-normal text-muted-foreground">/{proteinGoal}g</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Glucides</p>
                    <p className="font-semibold text-foreground">
                      {Math.round(daySummary.carbs)}
                      <span className="text-xs font-normal text-muted-foreground">/{carbsGoal}g</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Lipides</p>
                    <p className="font-semibold text-foreground">
                      {Math.round(daySummary.fat)}
                      <span className="text-xs font-normal text-muted-foreground">/{fatGoal}g</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Meals by type */}
              {Object.entries(groupedLogs).length > 0 ? (
                Object.entries(groupedLogs).map(([mealType, logs]) => (
                  <div key={mealType} className="card-premium p-4">
                    <p className="font-medium text-foreground mb-3">
                      {MEAL_NAMES[mealType] || mealType}
                    </p>
                    <div className="space-y-2">
                      {logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground truncate">{log.food_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(log.logged_at), 'HH:mm')}
                            </p>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <p className="text-sm font-medium text-foreground">{log.calories} kcal</p>
                            <p className="text-xs text-muted-foreground">
                              P{Math.round(log.protein)}g • G{Math.round(log.carbs)}g • L{Math.round(log.fat)}g
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Utensils className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-lg font-semibold text-foreground">Aucun repas</p>
                  <p className="text-sm text-muted-foreground">Pas de repas enregistré ce jour</p>
                </div>
              )}
            </div>
          ) : null}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NutritionHistorySheet;

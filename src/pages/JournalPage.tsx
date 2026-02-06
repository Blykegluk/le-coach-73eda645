import { useState, useEffect } from 'react';
import { format, startOfDay, isToday, isYesterday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Dumbbell, Droplets, ChevronLeft, ChevronRight, Plus, Calendar, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getMealIcon, getMealColorClasses } from '@/utils/mealColors';

interface JournalEntry {
  id: string;
  type: 'workout' | 'meal' | 'water';
  title: string;
  subtitle?: string;
  mealType?: string;
  time: Date;
  meta?: string;
  status?: string;
}

const JournalPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { onOpenCoach } = useOutletContext<{ onOpenCoach: () => void }>();

  useEffect(() => {
    loadEntries();
  }, [selectedDate]);

  const loadEntries = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const startOfDayDate = startOfDay(selectedDate);
      const endOfDayDate = new Date(startOfDayDate);
      endOfDayDate.setDate(endOfDayDate.getDate() + 1);

      const allEntries: JournalEntry[] = [];

      // Fetch ONLY completed workout sessions for this day
      const { data: workouts } = await supabase
        .from('workout_sessions')
        .select('id, workout_name, started_at, completed_at, total_duration_seconds, target_muscles, status')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .gte('started_at', startOfDayDate.toISOString())
        .lt('started_at', endOfDayDate.toISOString())
        .order('started_at', { ascending: true });

      if (workouts) {
        workouts.forEach(w => {
          const duration = w.total_duration_seconds
            ? `${Math.round(w.total_duration_seconds / 60)} min`
            : 'Terminée';
          allEntries.push({
            id: `workout-${w.id}`,
            type: 'workout',
            title: w.workout_name,
            subtitle: w.target_muscles?.join(', ') || 'Entraînement',
            time: parseISO(w.started_at),
            meta: duration,
            status: 'completed',
          });
        });
      }

      // Fetch nutrition logs
      const { data: meals } = await supabase
        .from('nutrition_logs')
        .select('id, food_name, meal_type, calories, protein, logged_at')
        .eq('user_id', user.id)
        .gte('logged_at', startOfDayDate.toISOString())
        .lt('logged_at', endOfDayDate.toISOString())
        .order('logged_at', { ascending: true });

      if (meals) {
        meals.forEach(m => {
          const mealTypeLabels: Record<string, string> = {
            breakfast: 'Petit-déjeuner',
            lunch: 'Déjeuner', 
            dinner: 'Dîner',
            snack: 'Collation',
          };
          allEntries.push({
            id: `meal-${m.id}`,
            type: 'meal',
            title: m.food_name,
            subtitle: mealTypeLabels[m.meal_type] || m.meal_type,
            mealType: m.meal_type,
            time: parseISO(m.logged_at),
            meta: m.calories ? `${m.calories} kcal` : undefined,
          });
        });
      }

      // Fetch water from daily_metrics
      const { data: metrics } = await supabase
        .from('daily_metrics')
        .select('water_ml, updated_at')
        .eq('user_id', user.id)
        .eq('date', dateStr)
        .maybeSingle();

      if (metrics?.water_ml) {
        allEntries.push({
          id: `water-${dateStr}`,
          type: 'water',
          title: 'Hydratation',
          subtitle: `${metrics.water_ml} ml`,
          time: parseISO(metrics.updated_at),
          meta: `${Math.round((metrics.water_ml / 2000) * 100)}%`,
        });
      }

      // Sort by time
      allEntries.sort((a, b) => a.time.getTime() - b.time.getTime());
      setEntries(allEntries);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setSelectedDate(newDate);
  };

  const getDateLabel = () => {
    if (isToday(selectedDate)) return "Aujourd'hui";
    if (isYesterday(selectedDate)) return 'Hier';
    return format(selectedDate, 'EEEE d MMMM', { locale: fr });
  };

  const getEntryIcon = (type: JournalEntry['type'], mealType?: string) => {
    switch (type) {
      case 'workout': return Dumbbell;
      case 'meal': return getMealIcon(mealType || 'lunch');
      case 'water': return Droplets;
    }
  };

  const getEntryColorClasses = (entry: JournalEntry): string => {
    if (entry.type === 'workout') {
      // Always completed now, use a success/green token via primary
      return 'text-primary bg-primary/10';
    }
    if (entry.type === 'meal') {
      return getMealColorClasses(entry.mealType || 'lunch');
    }
    // water
    return 'text-water bg-water/10';
  };

  // Separate workouts from nutrition/water
  const workoutEntries = entries.filter(e => e.type === 'workout');
  const nutritionEntries = entries.filter(e => e.type === 'meal' || e.type === 'water');

  const renderEntry = (entry: JournalEntry) => {
    const Icon = getEntryIcon(entry.type, entry.mealType);
    const colorClass = getEntryColorClasses(entry);

    return (
      <div key={entry.id} className="flex gap-3 rounded-xl bg-card border border-border/50 p-3">
        {/* Icon */}
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-foreground text-sm truncate">{entry.title}</h3>
              {entry.subtitle && (
                <p className="text-xs text-muted-foreground truncate">{entry.subtitle}</p>
              )}
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-xs font-medium text-foreground">
                {format(entry.time, 'HH:mm')}
              </p>
              {entry.meta && (
                <p className={`text-xs ${entry.status === 'aborted' ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                  {entry.meta}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-full pb-20 md:pb-4">
      {/* Header */}
      <header className="safe-top sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Journal</h1>
            <p className="text-sm text-muted-foreground">Ton historique unifié</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => setSelectedDate(new Date())}
          >
            <Calendar className="h-5 w-5" />
          </Button>
        </div>

        {/* Date navigation */}
        <div className="flex items-center justify-between px-4 pb-4">
          <button
            onClick={() => navigateDay('prev')}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="font-semibold text-foreground capitalize">{getDateLabel()}</p>
            <p className="text-xs text-muted-foreground">
              {format(selectedDate, 'd MMMM yyyy', { locale: fr })}
            </p>
          </div>
          <button
            onClick={() => navigateDay('next')}
            disabled={isToday(selectedDate)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-12 w-12 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Aucune activité</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Rien n'a été enregistré ce jour-là
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/training')}
                className="gap-2"
              >
                <Dumbbell className="h-4 w-4" />
                Entraînement
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/nutrition')}
                className="gap-2"
              >
                <UtensilsCrossed className="h-4 w-4" />
                Repas
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Workout Section */}
            {workoutEntries.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="h-4 w-4 text-energy" />
                  <h2 className="text-sm font-semibold text-foreground">Entraînements</h2>
                  <span className="text-xs text-muted-foreground">({workoutEntries.length})</span>
                </div>
                <div className="space-y-2">
                  {workoutEntries.map(renderEntry)}
                </div>
              </section>
            )}

            {/* Separator if both sections have content */}
            {workoutEntries.length > 0 && nutritionEntries.length > 0 && (
              <div className="border-t border-border/50" />
            )}

            {/* Nutrition Section */}
            {nutritionEntries.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <UtensilsCrossed className="h-4 w-4 text-calories" />
                  <h2 className="text-sm font-semibold text-foreground">Nutrition</h2>
                  <span className="text-xs text-muted-foreground">({nutritionEntries.length})</span>
                </div>
                <div className="space-y-2">
                  {nutritionEntries.map(renderEntry)}
                </div>
              </section>
            )}
          </div>
        )}
      </div>

      {/* FAB for adding */}
      <button
        onClick={() => onOpenCoach?.()}
        className="fixed bottom-24 md:bottom-8 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow-lg hover:scale-105 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
};

export default JournalPage;

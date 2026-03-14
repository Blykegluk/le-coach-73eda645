import { useState, useCallback } from 'react';
import { format, isToday, isYesterday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { Dumbbell, Droplets, ChevronLeft, ChevronRight, Plus, Calendar, Zap, UtensilsCrossed } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { getMealIcon, getMealColorClasses } from '@/utils/mealColors';
import JournalEntryActions from '@/components/journal/JournalEntryActions';
import CircularProgressRings from '@/components/home/CircularProgressRings';
import AppHeader from '@/components/layout/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useNutritionGoals } from '@/hooks/useNutritionGoals';
import { useJournalDay, useJournalRealtimeInvalidation, journalKeys, type JournalEntry } from '@/hooks/queries/useJournalQueries';

const JournalPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showActions, setShowActions] = useState(false);
  const navigate = useNavigate();
  const { onOpenCoach } = useOutletContext<{ onOpenCoach: () => void }>();
  const { user } = useAuth();
  const { profile } = useProfile();
  const nutritionGoals = useNutritionGoals(profile);
  const caloriesGoal = nutritionGoals.calories;
  const proteinGoal = nutritionGoals.protein;
  const carbsGoal = nutritionGoals.carbs;

  const queryClient = useQueryClient();
  const { data, isLoading } = useJournalDay(user?.id, selectedDate);
  useJournalRealtimeInvalidation(user?.id);

  const handleEntryUpdated = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: journalKeys.all });
  }, [queryClient]);

  const entries = data?.entries ?? [];
  const daySummary = data?.summary ?? { calories: 0, protein: 0, carbs: 0, waterMl: 0 };

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
      return 'text-primary bg-primary/10';
    }
    if (entry.type === 'meal') {
      return getMealColorClasses(entry.mealType || 'lunch');
    }
    return 'text-water bg-water/10';
  };

  const workoutEntries = entries.filter(e => e.type === 'workout');
  const nutritionEntries = entries.filter(e => e.type === 'meal' || e.type === 'water');

  const renderEntry = (entry: JournalEntry) => {
    const Icon = getEntryIcon(entry.type, entry.mealType);
    const colorClass = getEntryColorClasses(entry);

    return (
      <div
        key={entry.id}
        className="flex gap-3 rounded-xl bg-card border border-border/50 p-3 cursor-pointer active:scale-[0.98] transition-transform"
        onClick={() => {
          if (entry.type !== 'water') {
            setSelectedEntry(entry);
            setShowActions(true);
          }
        }}
      >
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${colorClass}`}>
          <Icon className="h-5 w-5" />
        </div>

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
      <header className="safe-top sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="px-4 pt-4">
          <AppHeader title="Journal" subtitle="Ton historique unifié" />
        </div>

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

      {/* Daily Progress Rings */}
      {!isLoading && (
        <div className="px-4 pt-4">
          <CircularProgressRings
            caloriesConsumed={daySummary.calories}
            caloriesGoal={caloriesGoal}
            proteinConsumed={daySummary.protein}
            proteinGoal={proteinGoal}
            carbsConsumed={daySummary.carbs}
            carbsGoal={carbsGoal}
          />
        </div>
      )}

      <div className="flex-1 px-4 py-4">
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
                onClick={() => navigate('/progress')}
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

            {workoutEntries.length > 0 && nutritionEntries.length > 0 && (
              <div className="border-t border-border/50" />
            )}

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

      <button
        onClick={() => onOpenCoach?.()}
        className="fixed bottom-24 md:bottom-8 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground shadow-glow-lg hover:scale-105 transition-transform"
      >
        <Plus className="h-6 w-6" />
      </button>

      <JournalEntryActions
        entry={selectedEntry}
        isOpen={showActions}
        onClose={() => setShowActions(false)}
        onEntryUpdated={handleEntryUpdated}
      />
    </div>
  );
};

export default JournalPage;

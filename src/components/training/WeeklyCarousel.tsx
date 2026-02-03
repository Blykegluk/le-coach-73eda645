import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Dumbbell, Clock, Flame } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Activity {
  id: string;
  activity_type: string;
  duration_min: number;
  calories_burned: number | null;
  distance_km: number | null;
  notes: string | null;
  performed_at: string;
}

interface WeekData {
  weekStart: Date;
  weekEnd: Date;
  label: string;
  sessions: number;
  totalMinutes: number;
  totalCalories: number;
  activities: Activity[];
}

// MET-based calorie estimation
const estimateCalories = (activity: Activity, weightKg: number = 70): number => {
  if (activity.calories_burned !== null && activity.calories_burned > 0) {
    return activity.calories_burned;
  }
  
  const activityLower = activity.activity_type.toLowerCase();
  let met = 4;
  
  if (activityLower.includes("course") || activityLower.includes("running") || activityLower.includes("jogging")) {
    met = 8;
  } else if (activityLower.includes("musculation") || activityLower.includes("muscu") || activityLower.includes("poids")) {
    met = 5;
  } else if (activityLower.includes("hiit") || activityLower.includes("crossfit") || activityLower.includes("hyrox")) {
    met = 10;
  } else if (activityLower.includes("vélo") || activityLower.includes("cycling") || activityLower.includes("bike")) {
    met = 7;
  } else if (activityLower.includes("natation") || activityLower.includes("swimming")) {
    met = 7;
  } else if (activityLower.includes("yoga") || activityLower.includes("stretching") || activityLower.includes("pilates")) {
    met = 3;
  } else if (activityLower.includes("marche") || activityLower.includes("walk")) {
    met = 3.5;
  }
  
  return Math.round(met * weightKg * (activity.duration_min / 60));
};

interface WeeklyCarouselProps {
  userWeight?: number;
}

const WeeklyCarousel = ({ userWeight = 70 }: WeeklyCarouselProps) => {
  const { user } = useAuth();
  const [weeks, setWeeks] = useState<WeekData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [detailSheet, setDetailSheet] = useState<{ isOpen: boolean; week: WeekData | null }>({
    isOpen: false,
    week: null,
  });

  useEffect(() => {
    const fetchAllActivities = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('performed_at', { ascending: false })
        .limit(100);

      if (!data) return;

      // Generate last 8 weeks
      const now = new Date();
      const weeksData: WeekData[] = [];

      for (let i = 0; i < 8; i++) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        
        const weekActivities = data.filter(a => 
          isWithinInterval(new Date(a.performed_at), { start: weekStart, end: weekEnd })
        );

        const stats = weekActivities.reduce(
          (acc, a) => ({
            sessions: acc.sessions + 1,
            totalMinutes: acc.totalMinutes + a.duration_min,
            totalCalories: acc.totalCalories + estimateCalories(a as Activity, userWeight),
          }),
          { sessions: 0, totalMinutes: 0, totalCalories: 0 }
        );

        let label: string;
        if (i === 0) {
          label = 'Cette semaine';
        } else if (i === 1) {
          label = 'Semaine dernière';
        } else {
          label = `${format(weekStart, 'd MMM', { locale: fr })} - ${format(weekEnd, 'd MMM', { locale: fr })}`;
        }

        weeksData.push({
          weekStart,
          weekEnd,
          label,
          ...stats,
          activities: weekActivities as Activity[],
        });
      }

      setWeeks(weeksData);
    };

    fetchAllActivities();
  }, [user, userWeight]);

  const navigatePrev = () => {
    if (currentIndex < weeks.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const navigateNext = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const currentWeek = weeks[currentIndex];

  if (!currentWeek || currentWeek.sessions === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-6 card-premium p-4">
        {/* Navigation header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={navigatePrev}
            disabled={currentIndex >= weeks.length - 1}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="h-4 w-4 text-primary" />
              <div className="absolute inset-0 bg-primary/30 blur-sm rounded-full" />
            </div>
            <span className="text-sm font-medium text-foreground">{currentWeek.label}</span>
          </div>
          
          <button
            onClick={navigateNext}
            disabled={currentIndex <= 0}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Stats grid - clickable */}
        <div 
          onClick={() => setDetailSheet({ isOpen: true, week: currentWeek })}
          className="grid grid-cols-3 gap-4 text-center cursor-pointer hover:bg-primary/5 rounded-xl p-2 -m-2 transition-colors"
        >
          <div>
            <p className="text-2xl font-bold text-gradient-primary">{currentWeek.sessions}</p>
            <p className="text-xs text-muted-foreground">séances</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{currentWeek.totalMinutes}</p>
            <p className="text-xs text-muted-foreground">minutes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{currentWeek.totalCalories}</p>
            <p className="text-xs text-muted-foreground">kcal brûlées</p>
          </div>
        </div>

        {/* Hint */}
        <p className="text-xs text-muted-foreground/70 text-center mt-3">
          ← Glisser pour voir les semaines précédentes • Tap pour détails
        </p>
      </div>

      {/* Week Detail Sheet */}
      <Sheet open={detailSheet.isOpen} onOpenChange={(open) => setDetailSheet({ isOpen: open, week: open ? detailSheet.week : null })}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {detailSheet.week?.label}
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(80vh-100px)]">
            {detailSheet.week && detailSheet.week.activities.length > 0 ? (
              <div className="space-y-3 pr-4">
                {/* Summary card */}
                <div className="card-premium p-4 mb-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xl font-bold text-gradient-primary">{detailSheet.week.sessions}</p>
                      <p className="text-xs text-muted-foreground">séances</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{detailSheet.week.totalMinutes}</p>
                      <p className="text-xs text-muted-foreground">min totales</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{detailSheet.week.totalCalories}</p>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                  </div>
                </div>

                {/* Individual activities */}
                {detailSheet.week.activities.map((activity) => {
                  const calories = estimateCalories(activity, userWeight);
                  const date = new Date(activity.performed_at);
                  
                  return (
                    <div key={activity.id} className="card-premium p-4">
                      <div className="flex items-start gap-3">
                        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                          <Dumbbell className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground capitalize">{activity.activity_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(date, 'EEEE d MMMM', { locale: fr })} à {format(date, 'HH:mm')}
                          </p>
                          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {activity.duration_min} min
                            </span>
                            <span className="flex items-center gap-1">
                              <Flame className="h-3 w-3 text-primary" />
                              ~{calories} kcal
                            </span>
                            {activity.distance_km && (
                              <span>{activity.distance_km} km</span>
                            )}
                          </div>
                          {activity.notes && (
                            <p className="text-xs text-muted-foreground/70 mt-2">{activity.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Dumbbell className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold text-foreground">Aucune séance</p>
                <p className="text-sm text-muted-foreground">Pas d'activité enregistrée cette semaine</p>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default WeeklyCarousel;

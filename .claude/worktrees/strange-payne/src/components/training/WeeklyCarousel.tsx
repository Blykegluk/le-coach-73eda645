import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Dumbbell, Clock, Flame, ChevronDown } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Activity {
  id: string;
  activity_type: string;
  duration_min: number;
  calories_burned: number | null;
  distance_km: number | null;
  notes: string | null;
  performed_at: string;
}

interface ExerciseLog {
  id: string;
  exercise_name: string;
  planned_sets: number;
  planned_reps: string;
  planned_weight: string | null;
  actual_sets: number | null;
  actual_reps: string | null;
  actual_weight: string | null;
  exercise_order: number;
  skipped: boolean | null;
}

interface WorkoutSession {
  id: string;
  workout_name: string;
  started_at: string;
  completed_at: string | null;
  total_duration_seconds: number | null;
  target_muscles: string[] | null;
  status: string;
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
  const [workoutSessions, setWorkoutSessions] = useState<Map<string, WorkoutSession>>(new Map());
  const [exerciseLogs, setExerciseLogs] = useState<Map<string, ExerciseLog[]>>(new Map());
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [loadingSession, setLoadingSession] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllActivities = async () => {
      if (!user) return;

      // Fetch activities and workout sessions in parallel
      const [activitiesRes, sessionsRes] = await Promise.all([
        supabase
          .from('activities')
          .select('*')
          .eq('user_id', user.id)
          .order('performed_at', { ascending: false })
          .limit(100),
        supabase
          .from('workout_sessions')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('started_at', { ascending: false })
          .limit(50),
      ]);

      const data = activitiesRes.data || [];
      const sessions = sessionsRes.data || [];

      // Map sessions by date for quick lookup
      const sessionsMap = new Map<string, WorkoutSession>();
      sessions.forEach(s => {
        const dateKey = format(new Date(s.started_at), 'yyyy-MM-dd');
        sessionsMap.set(dateKey, s as WorkoutSession);
      });
      setWorkoutSessions(sessionsMap);

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

  // Find next week with data when navigating backwards
  const findNextWeekWithData = (startIdx: number, direction: 'prev' | 'next'): number => {
    if (direction === 'prev') {
      for (let i = startIdx + 1; i < weeks.length; i++) {
        if (weeks[i].sessions > 0) return i;
      }
    } else {
      for (let i = startIdx - 1; i >= 0; i--) {
        if (weeks[i].sessions > 0) return i;
      }
    }
    return -1;
  };

  const canNavigatePrev = findNextWeekWithData(currentIndex, 'prev') !== -1;
  const canNavigateNext = findNextWeekWithData(currentIndex, 'next') !== -1;

  const navigatePrev = () => {
    const nextIdx = findNextWeekWithData(currentIndex, 'prev');
    if (nextIdx !== -1) {
      setCurrentIndex(nextIdx);
    }
  };

  const navigateNext = () => {
    const nextIdx = findNextWeekWithData(currentIndex, 'next');
    if (nextIdx !== -1) {
      setCurrentIndex(nextIdx);
    }
  };

  const loadExerciseLogs = async (sessionId: string) => {
    if (exerciseLogs.has(sessionId)) return;
    
    setLoadingSession(sessionId);
    const { data } = await supabase
      .from('workout_exercise_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('exercise_order', { ascending: true });
    
    if (data) {
      setExerciseLogs(prev => new Map(prev).set(sessionId, data as ExerciseLog[]));
    }
    setLoadingSession(null);
  };

  const toggleSession = async (activity: Activity) => {
    const dateKey = format(new Date(activity.performed_at), 'yyyy-MM-dd');
    const session = workoutSessions.get(dateKey);
    
    if (!session) return;
    
    const isExpanded = expandedSessions.has(session.id);
    
    if (isExpanded) {
      setExpandedSessions(prev => {
        const next = new Set(prev);
        next.delete(session.id);
        return next;
      });
    } else {
      await loadExerciseLogs(session.id);
      setExpandedSessions(prev => new Set(prev).add(session.id));
    }
  };

  const currentWeek = weeks[currentIndex];

  // Show carousel even if current week has no data, as long as there's any week with data
  const hasAnyData = weeks.some(w => w.sessions > 0);
  
  if (!hasAnyData) {
    return null;
  }

  // If current week has no data, find first week with data
  if (currentWeek && currentWeek.sessions === 0) {
    const firstWithData = weeks.findIndex(w => w.sessions > 0);
    if (firstWithData !== -1 && firstWithData !== currentIndex) {
      setCurrentIndex(firstWithData);
      return null;
    }
  }

  if (!currentWeek) return null;

  return (
    <>
      <div className="mb-6 card-premium p-4">
        {/* Navigation header */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={navigatePrev}
            disabled={!canNavigatePrev}
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
            disabled={!canNavigateNext}
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
          ← → Naviguer entre les semaines • Tap pour détails
        </p>
      </div>

      {/* Week Detail Sheet */}
      <Sheet open={detailSheet.isOpen} onOpenChange={(open) => {
        setDetailSheet({ isOpen: open, week: open ? detailSheet.week : null });
        if (!open) {
          setExpandedSessions(new Set());
        }
      }}>
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
                  const dateKey = format(date, 'yyyy-MM-dd');
                  const session = workoutSessions.get(dateKey);
                  const isExpanded = session ? expandedSessions.has(session.id) : false;
                  const logs = session ? exerciseLogs.get(session.id) || [] : [];
                  const isLoading = loadingSession === session?.id;
                  
                  return (
                    <Collapsible
                      key={activity.id}
                      open={isExpanded}
                      onOpenChange={() => session && toggleSession(activity)}
                    >
                      <div className="card-premium p-4">
                        <CollapsibleTrigger asChild>
                          <div className={`flex items-start gap-3 ${session ? 'cursor-pointer' : ''}`}>
                            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                              <Dumbbell className="h-5 w-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-foreground capitalize">{activity.activity_type}</p>
                                {session && (
                                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                )}
                              </div>
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
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          {isLoading ? (
                            <div className="mt-4 pt-4 border-t border-border flex justify-center">
                              <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                            </div>
                          ) : logs.length > 0 ? (
                            <div className="mt-4 pt-4 border-t border-border space-y-3">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Détails des exercices
                              </p>
                              {logs.map((log) => (
                                <div 
                                  key={log.id} 
                                  className={`flex items-center justify-between py-2 px-3 rounded-lg ${log.skipped ? 'bg-muted/50 opacity-60' : 'bg-muted/30'}`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${log.skipped ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                      {log.exercise_name}
                                    </p>
                                    {!log.skipped && (
                                      <p className="text-xs text-muted-foreground">
                                        Prévu: {log.planned_sets}×{log.planned_reps}
                                        {log.planned_weight && ` @ ${log.planned_weight}`}
                                      </p>
                                    )}
                                  </div>
                                  {!log.skipped && (log.actual_sets || log.actual_reps || log.actual_weight) && (
                                    <div className="text-right shrink-0 ml-3">
                                      <p className="text-sm font-semibold text-primary">
                                        {log.actual_sets || log.planned_sets}×{log.actual_reps || log.planned_reps}
                                      </p>
                                      {log.actual_weight && (
                                        <p className="text-xs text-muted-foreground">{log.actual_weight}</p>
                                      )}
                                    </div>
                                  )}
                                  {log.skipped && (
                                    <span className="text-xs text-muted-foreground italic">Passé</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : session ? (
                            <div className="mt-4 pt-4 border-t border-border">
                              <p className="text-xs text-muted-foreground text-center italic">
                                Pas de détails d'exercices enregistrés
                              </p>
                            </div>
                          ) : null}
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
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

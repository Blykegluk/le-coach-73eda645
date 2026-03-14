import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, Clock, Flame } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, subMonths, addMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

interface CalendarSession {
  id: string;
  workout_name: string;
  started_at: string;
  completed_at: string | null;
  total_duration_seconds: number | null;
  target_muscles: string[] | null;
  status: string;
}

interface TrainingCalendarProps {
  userId: string | undefined;
}

const TrainingCalendar = ({ userId }: TrainingCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchSessions = async () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);

      const { data } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('started_at', monthStart.toISOString())
        .lte('started_at', monthEnd.toISOString());

      setSessions((data || []) as CalendarSession[]);
    };

    fetchSessions();
  }, [userId, currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  // Build grid of days
  const days: Date[] = [];
  let day = calendarStart;
  while (day <= calendarEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const getSessionsForDay = (d: Date) =>
    sessions.filter(s => isSameDay(new Date(s.started_at), d));

  const selectedSessions = selectedDate ? getSessionsForDay(selectedDate) : [];

  const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <>
      <div className="mb-6 card-premium p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h3 className="text-sm font-semibold capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </h3>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekDays.map((wd, i) => (
            <div key={i} className="text-center text-xs text-muted-foreground font-medium py-1">
              {wd}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const inMonth = isSameMonth(d, currentMonth);
            const today = isToday(d);
            const daySessions = getSessionsForDay(d);
            const hasSession = daySessions.length > 0;

            return (
              <button
                key={i}
                onClick={() => {
                  if (hasSession) {
                    setSelectedDate(d);
                    setDetailOpen(true);
                  }
                }}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all ${
                  !inMonth
                    ? 'text-muted-foreground/30'
                    : today
                      ? 'bg-primary/10 text-primary font-bold'
                      : 'text-foreground'
                } ${hasSession ? 'cursor-pointer hover:bg-primary/10' : ''}`}
              >
                <span>{format(d, 'd')}</span>
                {hasSession && (
                  <div className="flex gap-0.5 mt-0.5">
                    {daySessions.map((_, j) => (
                      <div key={j} className="h-1 w-1 rounded-full bg-primary" />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day detail sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[60vh]">
          <SheetHeader className="pb-4">
            <SheetTitle>
              {selectedDate && format(selectedDate, 'EEEE d MMMM', { locale: fr })}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-3 pb-4">
            {selectedSessions.map((s) => (
              <div key={s.id} className="card-premium p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{s.workout_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {s.total_duration_seconds && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.round(s.total_duration_seconds / 60)} min
                        </span>
                      )}
                      {s.target_muscles && s.target_muscles.length > 0 && (
                        <span className="flex flex-wrap gap-1">
                          {s.target_muscles.map((m, i) => (
                            <span key={i} className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary capitalize">
                              {m}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default TrainingCalendar;

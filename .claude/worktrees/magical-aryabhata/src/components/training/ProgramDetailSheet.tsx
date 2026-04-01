import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar, ChevronRight, CheckCircle2, Circle, Pause, Play, Trash2,
  Loader2, Dumbbell, AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useProgramDetail,
  useProgramWeekSessions,
  useUpdateProgram,
  useSkipProgramSession,
  type TrainingProgram,
  type ProgramWeek,
  type ProgramSession,
} from '@/hooks/queries/useTrainingPrograms';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

interface ProgramDetailSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  program: TrainingProgram;
  onStartSession?: (workoutData: Json, programSessionId: string) => void;
}

// Extract workout name from workout_data JSON
function getWorkoutName(data: Json): string {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, Json | undefined>;
    return (obj.workout_name as string) || 'Séance';
  }
  return 'Séance';
}

function getTargetMuscles(data: Json): string[] {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, Json | undefined>;
    return (obj.target_muscles as string[]) || [];
  }
  return [];
}

const FOCUS_LABELS: Record<string, string> = {
  hypertrophy: 'Hypertrophie',
  strength: 'Force',
  endurance: 'Endurance',
  deload: 'Deload',
  power: 'Puissance',
};

const GOAL_LABELS: Record<string, string> = {
  lose_fat: 'Perte de gras',
  build_muscle: 'Prise de muscle',
  maintain: 'Maintien',
  recomposition: 'Recomposition',
  general_fitness: 'Forme générale',
};

const DAY_NAMES = ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function ProgramDetailSheet({ isOpen, onOpenChange, program, onStartSession }: ProgramDetailSheetProps) {
  const { user } = useAuth();
  const { data: detail, isLoading } = useProgramDetail(isOpen ? program.id : undefined);
  const updateProgram = useUpdateProgram(user?.id);
  const [selectedWeek, setSelectedWeek] = useState<ProgramWeek | null>(null);

  const handlePauseResume = async () => {
    const newStatus = program.status === 'active' ? 'paused' : 'active';
    try {
      await updateProgram.mutateAsync({
        programId: program.id,
        updates: { status: newStatus },
      });
      toast.success(newStatus === 'paused' ? 'Programme en pause' : 'Programme repris');
    } catch {
      toast.error('Erreur');
    }
  };

  const handleAbandon = async () => {
    try {
      await updateProgram.mutateAsync({
        programId: program.id,
        updates: { status: 'abandoned' },
      });
      toast.success('Programme abandonné');
      onOpenChange(false);
    } catch {
      toast.error('Erreur');
    }
  };

  const weeks = detail?.weeks ?? [];
  const completedWeeks = program.current_week - 1;
  const progressPct = Math.round((completedWeeks / program.duration_weeks) * 100);

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-left">
            <Dumbbell className="h-5 w-5 text-primary" />
            {program.name}
          </SheetTitle>
        </SheetHeader>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : selectedWeek ? (
          <WeekDetail
            week={selectedWeek}
            onBack={() => setSelectedWeek(null)}
            onStartSession={onStartSession}
            programCurrentWeek={program.current_week}
          />
        ) : (
          <ScrollArea className="h-[calc(90vh-180px)]">
            <div className="space-y-4 pb-6">
              {/* Program info */}
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {GOAL_LABELS[program.goal] || program.goal}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  {program.difficulty === 'beginner' ? 'Débutant' : program.difficulty === 'intermediate' ? 'Intermédiaire' : 'Avancé'}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  {program.sessions_per_week}x/sem
                </span>
              </div>

              {program.description && (
                <p className="text-sm text-muted-foreground">{program.description}</p>
              )}

              {/* Progress bar */}
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Semaine {program.current_week}/{program.duration_weeks}</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Weeks list */}
              <div className="space-y-2">
                {weeks.map(week => {
                  const isCurrent = week.week_number === program.current_week;
                  const isPast = week.week_number < program.current_week;
                  const isFuture = week.week_number > program.current_week;

                  return (
                    <button
                      key={week.id}
                      onClick={() => setSelectedWeek(week)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                        isCurrent
                          ? 'border-primary bg-primary/5'
                          : isPast
                          ? 'border-border bg-muted/20'
                          : 'border-border bg-muted/10 opacity-60'
                      }`}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isPast ? 'bg-green-500/20 text-green-500' :
                        isCurrent ? 'bg-primary/20 text-primary' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {isPast ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <span className="text-xs font-bold">{week.week_number}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            Semaine {week.week_number}
                          </span>
                          {week.is_deload && (
                            <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-500">
                              DELOAD
                            </span>
                          )}
                          {isCurrent && (
                            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              EN COURS
                            </span>
                          )}
                        </div>
                        {week.focus && (
                          <p className="text-xs text-muted-foreground">
                            {FOCUS_LABELS[week.focus] || week.focus}
                          </p>
                        )}
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        )}

        {/* Actions */}
        {!selectedWeek && (program.status === 'active' || program.status === 'paused') && (
          <div className="flex gap-2 border-t border-border pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePauseResume}
              disabled={updateProgram.isPending}
            >
              {program.status === 'active' ? (
                <><Pause className="mr-1.5 h-3.5 w-3.5" /> Pause</>
              ) : (
                <><Play className="mr-1.5 h-3.5 w-3.5" /> Reprendre</>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAbandon}
              disabled={updateProgram.isPending}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Abandonner
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Week Detail Sub-view ───────────────────────────────────────────────────

function WeekDetail({ week, onBack, onStartSession, programCurrentWeek }: {
  week: ProgramWeek;
  onBack: () => void;
  onStartSession?: (workoutData: Json, programSessionId: string) => void;
  programCurrentWeek: number;
}) {
  const { user } = useAuth();
  const { data: sessions, isLoading } = useProgramWeekSessions(week.id);
  const skipSession = useSkipProgramSession(user?.id);

  const isCurrentWeek = week.week_number === programCurrentWeek;

  const handleSkip = async (sessionId: string) => {
    try {
      await skipSession.mutateAsync({ sessionId });
      toast.success('Séance marquée comme faite');
    } catch {
      toast.error('Erreur');
    }
  };

  return (
    <div className="flex flex-col h-[calc(90vh-120px)]">
      {/* Back button + title */}
      <button
        onClick={onBack}
        className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
        Retour
      </button>

      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          Semaine {week.week_number}
          {week.is_deload && (
            <span className="rounded bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-medium text-yellow-500">
              DELOAD
            </span>
          )}
        </h3>
        {week.focus && (
          <p className="text-sm text-muted-foreground mt-0.5">
            Focus: {FOCUS_LABELS[week.focus] || week.focus}
          </p>
        )}
        {week.notes && (
          <p className="text-xs text-muted-foreground mt-1">{week.notes}</p>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-20 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-3 pb-4">
            {sessions?.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                canStart={isCurrentWeek && !session.completed_at}
                onStart={() => onStartSession?.(session.workout_data, session.id)}
                onSkip={() => handleSkip(session.id)}
                isSkipping={skipSession.isPending}
              />
            ))}
            {!sessions?.length && (
              <div className="flex items-center gap-2 rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Aucune séance pour cette semaine
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

// ─── Session Card ───────────────────────────────────────────────────────────

function SessionCard({ session, canStart, onStart, onSkip, isSkipping }: {
  session: ProgramSession;
  canStart: boolean;
  onStart: () => void;
  onSkip: () => void;
  isSkipping: boolean;
}) {
  const workoutName = getWorkoutName(session.workout_data);
  const muscles = getTargetMuscles(session.workout_data);
  const isCompleted = !!session.completed_at;
  const isSkipped = isCompleted && !session.completed_session_id;

  return (
    <div className={`rounded-xl border p-3 ${
      isCompleted ? 'border-green-500/30 bg-green-500/5' : 'border-border'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="text-sm font-medium text-foreground truncate">
              {workoutName}
            </span>
            {isSkipped && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                passée
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1 ml-6">
            {session.day_of_week && (
              <span className="text-[10px] text-muted-foreground">
                {DAY_NAMES[session.day_of_week]}
              </span>
            )}
            {muscles.slice(0, 3).map(m => (
              <span key={m} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                {m}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {canStart && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={onSkip}
                disabled={isSkipping}
                className="text-xs text-muted-foreground h-7 px-2"
              >
                Déjà faite
              </Button>
              <Button size="sm" onClick={onStart} className="h-7">
                <Play className="mr-1 h-3 w-3" />
                Go
              </Button>
            </>
          )}

          {isCompleted && session.completed_at && (
            <span className="text-[10px] text-green-600">
              {new Date(session.completed_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

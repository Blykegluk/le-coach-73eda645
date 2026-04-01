import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Check, X, Edit2, Timer, Dumbbell, Info, AlertTriangle, ArrowRightLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Workout } from './NextWorkoutCard';
import { trackEvent } from '@/lib/analytics';
import { getExerciseIcon } from './ExerciseIcons';
import { ExerciseDetailSheet } from './ExerciseDetailSheet';
import { ExerciseSubstitutionSheet } from './ExerciseSubstitutionSheet';
import ExerciseFeedbackButtons, { FeedbackType } from './ExerciseFeedbackButtons';
import { useDetectPRs } from '@/hooks/queries/usePersonalRecords';

interface ExerciseLog {
  exercise_name: string;
  exercise_order: number;
  planned_sets: number;
  planned_reps: string;
  planned_weight: string;
  actual_sets: number;
  actual_reps: string;
  actual_weight: string;
  rest_seconds: number;
  duration_seconds: number;
  skipped: boolean;
  feedback?: ExerciseFeedback;
}

interface ActiveWorkoutSessionProps {
  workout: Workout;
  programSessionId?: string;
  onClose: () => void;
  onComplete: () => void;
}

type SessionPhase = 'exercise' | 'rest' | 'completed';
type ExerciseFeedback = 'too_easy' | 'pain' | 'ok' | null;

const STORAGE_KEY = 'active_workout_session';

interface PersistedState {
  sessionId: string | null;
  currentExerciseIndex: number;
  currentSet: number;
  phase: SessionPhase;
  isPaused: boolean;
  exerciseLogs: ExerciseLog[];
  // Timestamps for accurate time tracking across backgrounding
  sessionStartedAt: number;     // Date.now() when session started
  totalPausedMs: number;        // Total ms spent paused
  lastPauseStartedAt: number | null; // Date.now() when current pause started
  phaseStartedAt: number;       // Date.now() when current phase started
  restEndAt: number | null;     // Date.now() + restMs when rest started
  workoutName: string;          // To verify we're resuming the right session
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

function loadPersistedState(workoutName: string): PersistedState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const state = JSON.parse(raw) as PersistedState;
    if (state.workoutName !== workoutName) return null;
    if (state.phase === 'completed') return null;
    return state;
  } catch {
    return null;
  }
}

function clearPersistedState() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export const ActiveWorkoutSession = ({ workout, programSessionId, onClose, onComplete }: ActiveWorkoutSessionProps) => {
  const restored = useRef(loadPersistedState(workout.workout_name));
  const now = Date.now();

  const [sessionId, setSessionId] = useState<string | null>(restored.current?.sessionId ?? null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(restored.current?.currentExerciseIndex ?? 0);
  const [currentSet, setCurrentSet] = useState(restored.current?.currentSet ?? 1);
  const [phase, setPhase] = useState<SessionPhase>(restored.current?.phase ?? 'exercise');
  const [isPaused, setIsPaused] = useState(restored.current?.isPaused ?? false);

  // Timestamp-based timing
  const [sessionStartedAt] = useState(restored.current?.sessionStartedAt ?? now);
  const [totalPausedMs, setTotalPausedMs] = useState(() => {
    if (!restored.current) return 0;
    // If we were paused when backgrounded, add time since pause started
    if (restored.current.isPaused && restored.current.lastPauseStartedAt) {
      return restored.current.totalPausedMs + (now - restored.current.lastPauseStartedAt);
    }
    return restored.current.totalPausedMs;
  });
  const [lastPauseStartedAt, setLastPauseStartedAt] = useState<number | null>(() => {
    if (restored.current?.isPaused) return now; // Reset pause reference to now
    return null;
  });
  const [phaseStartedAt, setPhaseStartedAt] = useState(restored.current?.phaseStartedAt ?? now);
  const [restEndAt, setRestEndAt] = useState<number | null>(restored.current?.restEndAt ?? null);

  // Computed times from timestamps
  const [globalTime, setGlobalTime] = useState(0);
  const [phaseTime, setPhaseTime] = useState(0);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);

  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>(() =>
    restored.current?.exerciseLogs ?? workout.exercises.map((ex, index) => ({
      exercise_name: ex.name,
      exercise_order: index,
      planned_sets: ex.sets,
      planned_reps: ex.reps,
      planned_weight: ex.weight_recommendation,
      actual_sets: ex.sets,
      actual_reps: ex.reps,
      actual_weight: ex.weight_recommendation,
      rest_seconds: ex.rest_seconds,
      duration_seconds: 0,
      skipped: false,
      feedback: null,
    }))
  );

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isProcessingFeedback, setIsProcessingFeedback] = useState(false);

  const [editingExercise, setEditingExercise] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ sets: '', reps: '', weight: '' });
  const [viewingExerciseIndex, setViewingExerciseIndex] = useState<number | null>(null);
  const [substitutionOpen, setSubstitutionOpen] = useState(false);
  const [newPRs, setNewPRs] = useState<string[]>([]);
  const detectPRs = useDetectPRs();

  const currentExercise = workout.exercises[currentExerciseIndex];
  const currentLog = exerciseLogs[currentExerciseIndex];
  const totalSets = currentLog?.actual_sets || 1;
  const totalExerciseSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0);
  const completedSets = workout.exercises.slice(0, currentExerciseIndex).reduce((sum, ex) => sum + ex.sets, 0) + (currentSet - 1) + (phase === 'rest' ? 1 : 0);
  const progress = (completedSets / totalExerciseSets) * 100;

  // Persist state to sessionStorage on every meaningful change
  useEffect(() => {
    if (phase === 'completed') {
      clearPersistedState();
      return;
    }
    const state: PersistedState = {
      sessionId,
      currentExerciseIndex,
      currentSet,
      phase,
      isPaused,
      exerciseLogs,
      sessionStartedAt,
      totalPausedMs,
      lastPauseStartedAt,
      phaseStartedAt,
      restEndAt,
      workoutName: workout.workout_name,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [sessionId, currentExerciseIndex, currentSet, phase, isPaused, exerciseLogs, sessionStartedAt, totalPausedMs, lastPauseStartedAt, phaseStartedAt, restEndAt, workout.workout_name]);

  // Create session on mount (only if not restored)
  useEffect(() => {
    if (restored.current?.sessionId) return; // Already have a session from restoration

    const createSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: session.user.id,
          workout_name: workout.workout_name,
          target_muscles: workout.target_muscles,
          status: 'in_progress',
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating session:', error);
        toast.error('Erreur lors du démarrage de la séance');
      } else if (data) {
        setSessionId(data.id);
      }
    };

    createSession();
  }, [workout]);

  // Unified timer: compute all times from timestamps
  useEffect(() => {
    if (phase === 'completed') return;

    const tick = () => {
      const tickNow = Date.now();

      // Global time = elapsed - paused time
      let paused = totalPausedMs;
      if (isPaused && lastPauseStartedAt) {
        paused += tickNow - lastPauseStartedAt;
      }
      const globalMs = tickNow - sessionStartedAt - paused;
      setGlobalTime(Math.max(0, Math.floor(globalMs / 1000)));

      if (!isPaused) {
        if (phase === 'exercise') {
          const phaseMs = tickNow - phaseStartedAt;
          setPhaseTime(Math.max(0, Math.floor(phaseMs / 1000)));
        } else if (phase === 'rest' && restEndAt) {
          const remaining = Math.max(0, Math.ceil((restEndAt - tickNow) / 1000));
          setRestTimeRemaining(remaining);
          if (remaining <= 0) {
            handleRestComplete();
          }
        }
      }
    };

    tick(); // Immediate first tick (catches up after backgrounding)
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isPaused, phase, sessionStartedAt, totalPausedMs, lastPauseStartedAt, phaseStartedAt, restEndAt]);

  // Toggle pause with timestamp tracking
  const togglePause = useCallback(() => {
    const toggleNow = Date.now();
    if (isPaused) {
      // Resuming: accumulate paused time
      if (lastPauseStartedAt) {
        setTotalPausedMs(prev => prev + (toggleNow - lastPauseStartedAt));
      }
      setLastPauseStartedAt(null);
      setIsPaused(false);
    } else {
      // Pausing: record when pause started
      setLastPauseStartedAt(toggleNow);
      setIsPaused(true);
    }
  }, [isPaused, lastPauseStartedAt]);

  // Complete a set → start rest
  const handleSetDone = useCallback(() => {
    const restTime = currentLog?.rest_seconds || 60;
    const doneNow = Date.now();
    // Record exercise duration for this phase
    const phaseDuration = Math.floor((doneNow - phaseStartedAt) / 1000);
    setExerciseLogs(logs => logs.map((log, i) =>
      i === currentExerciseIndex ? { ...log, duration_seconds: log.duration_seconds + phaseDuration } : log
    ));
    setRestEndAt(doneNow + restTime * 1000);
    setRestTimeRemaining(restTime);
    setPhase('rest');
    setPhaseTime(0);
    setPhaseStartedAt(doneNow);
  }, [currentLog, phaseStartedAt, currentExerciseIndex]);

  // After rest: go to next set or next exercise
  const handleRestComplete = useCallback(() => {
    const restNow = Date.now();
    setRestEndAt(null);
    if (currentSet < totalSets) {
      setCurrentSet(s => s + 1);
      setPhase('exercise');
      setPhaseTime(0);
      setPhaseStartedAt(restNow);
      setRestTimeRemaining(0);
    } else {
      if (currentExerciseIndex >= workout.exercises.length - 1) {
        setPhase('completed');
      } else {
        setCurrentExerciseIndex(i => i + 1);
        setCurrentSet(1);
        setPhase('exercise');
        setPhaseTime(0);
        setPhaseStartedAt(restNow);
        setRestTimeRemaining(0);
        setFeedbackMessage(null);
      }
    }
  }, [currentSet, totalSets, currentExerciseIndex, workout.exercises.length]);

  const handleNextExercise = useCallback(() => {
    if (currentExerciseIndex >= workout.exercises.length - 1) {
      setPhase('completed');
      return;
    }
    const nextNow = Date.now();
    setCurrentExerciseIndex(i => i + 1);
    setCurrentSet(1);
    setPhase('exercise');
    setPhaseTime(0);
    setPhaseStartedAt(nextNow);
    setRestTimeRemaining(0);
    setRestEndAt(null);
    setFeedbackMessage(null);
  }, [currentExerciseIndex, workout.exercises.length]);

  const handlePreviousExercise = useCallback(() => {
    if (currentExerciseIndex <= 0) return;
    const prevNow = Date.now();
    setCurrentExerciseIndex(i => i - 1);
    setCurrentSet(1);
    setPhase('exercise');
    setPhaseTime(0);
    setPhaseStartedAt(prevNow);
    setRestTimeRemaining(0);
    setRestEndAt(null);
    setFeedbackMessage(null);
  }, [currentExerciseIndex]);

  const handleSkipExercise = useCallback(() => {
    setExerciseLogs(logs => logs.map((log, i) => 
      i === currentExerciseIndex ? { ...log, skipped: true } : log
    ));
    setFeedbackMessage(null);
    handleNextExercise();
  }, [currentExerciseIndex, handleNextExercise]);

  // Handle in-flow feedback
  const handleFeedback = useCallback(async (feedbackType: FeedbackType) => {
    setIsProcessingFeedback(true);
    
    // Store feedback for current exercise
    setExerciseLogs(logs => logs.map((log, i) => 
      i === currentExerciseIndex ? { ...log, feedback: feedbackType } : log
    ));
    
    // Generate contextual response based on feedback
    let message = '';
    let adjustment = null;
    
    switch (feedbackType) {
      case 'too_easy':
        // Suggest increasing weight or reps
        const currentWeight = currentLog?.actual_weight || '';
        const weightMatch = currentWeight.match(/(\d+)/);
        if (weightMatch) {
          const newWeight = Math.round(parseInt(weightMatch[1]) * 1.1);
          adjustment = { weight: currentWeight.replace(/\d+/, newWeight.toString()) };
          message = `💪 Bien joué ! Je te propose ${adjustment.weight} pour la prochaine série.`;
        } else {
          message = '💪 Super ! Essaie d\'augmenter légèrement la charge.';
        }
        break;
        
      case 'pain':
        message = '⚠️ Stop ! Passe à l\'exercice suivant ou réduis la charge de 20%.';
        // Suggest reducing weight
        const painWeight = currentLog?.actual_weight || '';
        const painMatch = painWeight.match(/(\d+)/);
        if (painMatch) {
          const reducedWeight = Math.round(parseInt(painMatch[1]) * 0.8);
          adjustment = { weight: painWeight.replace(/\d+/, reducedWeight.toString()) };
        }
        break;
        
      case 'ok':
        message = '✅ Parfait, continue comme ça !';
        break;
    }
    
    setFeedbackMessage(message);
    
    // Apply weight adjustment if suggested
    if (adjustment?.weight) {
      setExerciseLogs(logs => logs.map((log, i) => 
        i === currentExerciseIndex ? { ...log, actual_weight: adjustment.weight } : log
      ));
    }
    
    setIsProcessingFeedback(false);
    
    // Auto-hide message after 3 seconds
    setTimeout(() => setFeedbackMessage(null), 4000);
  }, [currentExerciseIndex, currentLog]);

  // Substitute current exercise
  const handleSubstitute = useCallback((newName: string) => {
    setExerciseLogs(logs => logs.map((log, i) =>
      i === currentExerciseIndex ? { ...log, exercise_name: newName } : log
    ));
    // Also update the workout object exercises array for display
    workout.exercises[currentExerciseIndex] = {
      ...workout.exercises[currentExerciseIndex],
      name: newName,
    };
  }, [currentExerciseIndex, workout]);

  const handleEditExercise = (index: number) => {
    const log = exerciseLogs[index];
    setEditForm({
      sets: log.actual_sets.toString(),
      reps: log.actual_reps,
      weight: log.actual_weight,
    });
    setEditingExercise(index);
  };

  const handleSaveEdit = () => {
    if (editingExercise === null) return;
    setExerciseLogs(logs => logs.map((log, i) => 
      i === editingExercise ? {
        ...log,
        actual_sets: parseInt(editForm.sets) || log.planned_sets,
        actual_reps: editForm.reps || log.planned_reps,
        actual_weight: editForm.weight || log.planned_weight,
      } : log
    ));
    setEditingExercise(null);
  };

  const handleCompleteSession = async () => {
    if (!sessionId) {
      toast.error('Session non trouvée');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Non connecté');
      return;
    }

    try {
      // Update session as completed
      await supabase
        .from('workout_sessions')
        .update({
          completed_at: new Date().toISOString(),
          total_duration_seconds: globalTime,
          status: 'completed',
        })
        .eq('id', sessionId);

      // Insert all exercise logs (exclude feedback which is not a DB column)
      const logsToInsert = exerciseLogs.map(({ feedback, ...log }) => ({
        session_id: sessionId,
        user_id: session.user.id,
        ...log,
      }));

      const { error: logsError } = await supabase
        .from('workout_exercise_logs')
        .insert(logsToInsert);

      if (logsError) throw logsError;

      // Detect personal records
      try {
        const prChecks = exerciseLogs
          .filter(l => !l.skipped)
          .map(l => {
            const weightMatch = l.actual_weight.match(/(\d+(?:[.,]\d+)?)/);
            const repsMatch = l.actual_reps.match(/(\d+)/);
            const weight = weightMatch ? parseFloat(weightMatch[1].replace(',', '.')) : 0;
            const reps = repsMatch ? parseInt(repsMatch[1]) : 0;
            return {
              exercise_name: l.exercise_name,
              weight,
              volume: l.actual_sets * reps * weight,
            };
          });

        const prs = await detectPRs.mutateAsync({
          userId: session.user.id,
          sessionId,
          exercises: prChecks,
        });
        if (prs.length > 0) setNewPRs(prs);
      } catch (prErr) {
        console.error('PR detection error:', prErr);
      }

      // Also log as an activity
      await supabase
        .from('activities')
        .insert({
          user_id: session.user.id,
          activity_type: 'musculation',
          duration_min: Math.round(globalTime / 60),
          notes: `${workout.workout_name} - ${exerciseLogs.filter(l => !l.skipped).length} exercices`,
        });

      // Mark program session as completed (if part of a program)
      if (programSessionId) {
        try {
          await supabase
            .from('program_sessions')
            .update({
              completed_session_id: sessionId,
              completed_at: new Date().toISOString(),
            })
            .eq('id', programSessionId);
        } catch (psErr) {
          console.error('Error marking program session complete:', psErr);
        }
      }

      trackEvent('workout_completed', {
        duration_min: Math.round(globalTime / 60),
        exercises: exerciseLogs.filter(l => !l.skipped).length,
        from_program: !!programSessionId,
      });

      clearPersistedState();
      toast.success('🎉 Séance enregistrée avec succès !');
      onComplete();
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleAbort = async () => {
    clearPersistedState();
    if (sessionId) {
      await supabase
        .from('workout_sessions')
        .update({ status: 'aborted' })
        .eq('id', sessionId);
    }
    onClose();
  };

  if (phase === 'completed') {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-xl">
          <h2 className="text-lg font-semibold">Séance terminée 🎉</h2>
          <span className="text-sm text-muted-foreground">{formatTime(globalTime)}</span>
        </div>

        {/* Summary */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="card-premium p-4 text-center">
            <Timer className="h-12 w-12 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold text-primary">{formatTime(globalTime)}</p>
            <p className="text-sm text-muted-foreground">Durée totale</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card-premium p-3 text-center">
              <p className="text-xl font-bold">{exerciseLogs.filter(l => !l.skipped).length}</p>
              <p className="text-xs text-muted-foreground">Exercices complétés</p>
            </div>
            <div className="card-premium p-3 text-center">
              <p className="text-xl font-bold">{exerciseLogs.reduce((sum, l) => sum + (l.skipped ? 0 : l.actual_sets), 0)}</p>
              <p className="text-xs text-muted-foreground">Séries totales</p>
            </div>
          </div>

          {newPRs.length > 0 && (
            <div className="card-premium p-4 border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold text-yellow-600">Nouveaux records !</h3>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {newPRs.map(name => (
                  <span key={name} className="rounded-full bg-yellow-500/20 px-2.5 py-1 text-xs font-medium text-yellow-600">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <h3 className="font-semibold mt-4">Récapitulatif des exercices</h3>
          <div className="space-y-2">
          {exerciseLogs.map((log, index) => {
              const ExIcon = getExerciseIcon(log.exercise_name);
              return (
                <div 
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${log.skipped ? 'bg-muted/20 border-border/50 opacity-50' : 'card-premium cursor-pointer hover:border-primary/50'}`}
                  onClick={() => !log.skipped && handleEditExercise(index)}
                >
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ExIcon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{log.exercise_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.skipped ? 'Passé' : `${log.actual_sets} × ${log.actual_reps} • ${log.actual_weight}`}
                    </p>
                  </div>
                  {!log.skipped && (
                    <Edit2 className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-card/80 backdrop-blur-xl">
          <Button className="w-full" size="lg" onClick={handleCompleteSession}>
            <Check className="h-5 w-5 mr-2" />
            Valider et enregistrer
          </Button>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editingExercise !== null} onOpenChange={() => setEditingExercise(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifier l'exercice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Séries</Label>
                <Input
                  type="number"
                  value={editForm.sets}
                  onChange={e => setEditForm(f => ({ ...f, sets: e.target.value }))}
                />
              </div>
              <div>
                <Label>Répétitions</Label>
                <Input
                  value={editForm.reps}
                  onChange={e => setEditForm(f => ({ ...f, reps: e.target.value }))}
                />
              </div>
              <div>
                <Label>Poids</Label>
                <Input
                  value={editForm.weight}
                  onChange={e => setEditForm(f => ({ ...f, weight: e.target.value }))}
                />
              </div>
              <Button className="w-full" onClick={handleSaveEdit}>
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const ExerciseIcon = currentExercise ? getExerciseIcon(currentExercise.name) : Dumbbell;

  return (
    <>
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col" style={{ height: '100dvh' }}>
      {/* Compact Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/80 backdrop-blur-xl">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleAbort}>
          <X className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="font-mono text-sm font-bold">{formatTime(globalTime)}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePause}>
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
      </div>

      {/* Progress bar */}
      <div className="px-3 py-1.5">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
          <span>Exercice {currentExerciseIndex + 1}/{workout.exercises.length} · Série {currentSet}/{totalSets}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Main content — fills remaining space */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-0">
        {phase === 'exercise' ? (
          <div className="flex flex-col items-center w-full max-w-sm">
            {/* Exercise name + actions */}
            <div className="w-full mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewingExerciseIndex(currentExerciseIndex)}
                  className="h-14 w-14 rounded-xl card-premium flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
                >
                  <ExerciseIcon className="h-9 w-9 text-primary" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold leading-tight">{currentExercise?.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{currentLog?.actual_weight}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Button variant="ghost" size="sm" className="h-8 px-3 text-xs gap-1" onClick={() => setViewingExerciseIndex(currentExerciseIndex)}>
                  <Info className="h-3.5 w-3.5" />
                  Détail
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-3 text-xs gap-1" onClick={() => setSubstitutionOpen(true)}>
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  Remplacer
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-3 text-xs gap-1" onClick={() => handleEditExercise(currentExerciseIndex)}>
                  <Edit2 className="h-3.5 w-3.5" />
                  Modifier
                </Button>
              </div>
            </div>

            {/* Set indicator pills */}
            <div className="flex items-center gap-1.5 mb-3">
              {Array.from({ length: totalSets }, (_, i) => (
                <div
                  key={i}
                  className={`h-2 w-6 rounded-full transition-all ${
                    i < currentSet - 1
                      ? 'bg-green-500'
                      : i === currentSet - 1
                        ? 'bg-primary'
                        : 'bg-muted'
                  }`}
                />
              ))}
            </div>

            {/* Series + reps */}
            <div className="flex items-center gap-3 text-base mb-3">
              <span className="text-primary font-semibold">Série {currentSet}/{totalSets}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-primary font-semibold">{currentLog?.actual_reps} reps</span>
            </div>

            {/* Timer */}
            <div className="card-premium px-5 py-2 mb-4">
              <p className="font-mono text-2xl font-bold">{formatTime(phaseTime)}</p>
            </div>

            {/* Feedback message */}
            {feedbackMessage && (
              <div className="mb-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 w-full">
                <p className="text-xs text-center">{feedbackMessage}</p>
              </div>
            )}

            {/* Feedback buttons */}
            <div className="w-full mb-2">
              <ExerciseFeedbackButtons onFeedback={handleFeedback} isLoading={isProcessingFeedback} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="h-24 w-24 rounded-full bg-energy/20 border border-energy/30 flex items-center justify-center mb-4 animate-pulse">
              <Timer className="h-12 w-12 text-energy" />
            </div>
            <h2 className="text-lg font-bold text-center mb-1">Repos</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {currentSet < totalSets
                ? `Série suivante : ${currentSet + 1}/${totalSets}`
                : `Prochain : ${workout.exercises[currentExerciseIndex + 1]?.name || 'Fin'}`
              }
            </p>
            <div className="card-premium px-6 py-3 mb-4 border-energy/30">
              <p className="font-mono text-3xl font-bold text-energy">{formatTime(restTimeRemaining)}</p>
            </div>
            {/* Custom rest timer buttons */}
            <div className="flex gap-2">
              {[30, 60, 90, 120].map(sec => (
                <button
                  key={sec}
                  onClick={() => { setRestTimeRemaining(sec); setRestEndAt(Date.now() + sec * 1000); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    restTimeRemaining === sec
                      ? 'bg-energy/20 text-energy border border-energy/30'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Exercise carousel strip */}
      <div className="px-3 pb-1">
        <div className="flex gap-1.5 overflow-x-auto py-1">
          {workout.exercises.map((ex, index) => {
            const Icon = getExerciseIcon(ex.name);
            const isActive = index === currentExerciseIndex;
            const isDone = index < currentExerciseIndex;
            const log = exerciseLogs[index];
            return (
              <button
                key={index}
                onClick={() => !isDone && handleEditExercise(index)}
                className={`flex-shrink-0 p-1.5 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-primary/20 border-primary ring-1 ring-primary'
                    : isDone
                      ? log?.skipped ? 'bg-muted/20 border-border/50 opacity-40' : 'bg-green-500/20 border-green-500/30'
                      : 'bg-card border-border'
                }`}
              >
                <Icon className="h-6 w-6" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-3 pb-3 pt-1 flex gap-2">
        <Button variant="ghost" size="icon" className="h-10 w-10 flex-shrink-0" onClick={handlePreviousExercise} disabled={currentExerciseIndex <= 0}>
          <SkipBack className="h-4 w-4" />
        </Button>
        {phase === 'exercise' ? (
          <>
            <Button variant="outline" className="flex-1 h-10" onClick={handleSkipExercise}>
              <SkipForward className="h-4 w-4 mr-1.5" />
              Passer
            </Button>
            <Button className="flex-1 h-10" onClick={handleSetDone}>
              <Check className="h-4 w-4 mr-1.5" />
              Série terminée
            </Button>
          </>
        ) : (
          <Button className="flex-1 h-10" onClick={handleRestComplete}>
            <SkipForward className="h-4 w-4 mr-1.5" />
            {currentSet < totalSets ? 'Série suivante' : 'Exercice suivant'}
          </Button>
        )}
      </div>
    </div>

      {/* Edit Dialog - outside fixed container for proper z-index */}
      <Dialog open={editingExercise !== null} onOpenChange={() => setEditingExercise(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'exercice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Séries</Label>
              <Input
                type="number"
                value={editForm.sets}
                onChange={e => setEditForm(f => ({ ...f, sets: e.target.value }))}
              />
            </div>
            <div>
              <Label>Répétitions</Label>
              <Input
                value={editForm.reps}
                onChange={e => setEditForm(f => ({ ...f, reps: e.target.value }))}
              />
            </div>
            <div>
              <Label>Poids</Label>
              <Input
                value={editForm.weight}
                onChange={e => setEditForm(f => ({ ...f, weight: e.target.value }))}
              />
            </div>
            <Button className="w-full" onClick={handleSaveEdit}>
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Exercise Substitution Sheet */}
      <ExerciseSubstitutionSheet
        isOpen={substitutionOpen}
        onClose={() => setSubstitutionOpen(false)}
        exerciseName={currentExercise?.name || ''}
        onSelect={handleSubstitute}
      />

      {/* Exercise Detail Sheet - outside fixed container for proper z-index */}
      <ExerciseDetailSheet
        isOpen={viewingExerciseIndex !== null}
        onClose={() => setViewingExerciseIndex(null)}
        exerciseName={viewingExerciseIndex !== null ? workout.exercises[viewingExerciseIndex]?.name || '' : ''}
        sets={viewingExerciseIndex !== null ? exerciseLogs[viewingExerciseIndex]?.actual_sets : undefined}
        reps={viewingExerciseIndex !== null ? exerciseLogs[viewingExerciseIndex]?.actual_reps : undefined}
        weight={viewingExerciseIndex !== null ? exerciseLogs[viewingExerciseIndex]?.actual_weight : undefined}
        notes={viewingExerciseIndex !== null ? workout.exercises[viewingExerciseIndex]?.notes : undefined}
      />
    </>
  );
};

export default ActiveWorkoutSession;

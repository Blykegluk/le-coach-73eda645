import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, SkipForward, Check, X, Edit2, Timer, Dumbbell, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Workout } from './NextWorkoutCard';
import { getExerciseIcon } from './ExerciseIcons';
import { ExerciseDetailSheet } from './ExerciseDetailSheet';
import ExerciseFeedbackButtons, { FeedbackType } from './ExerciseFeedbackButtons';
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
  onClose: () => void;
  onComplete: () => void;
}

type SessionPhase = 'exercise' | 'rest' | 'completed';
type ExerciseFeedback = 'too_easy' | 'pain' | 'ok' | null;
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const ActiveWorkoutSession = ({ workout, onClose, onComplete }: ActiveWorkoutSessionProps) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [phase, setPhase] = useState<SessionPhase>('exercise');
  const [isPaused, setIsPaused] = useState(false);
  const [globalTime, setGlobalTime] = useState(0);
  const [phaseTime, setPhaseTime] = useState(0);
  const [restTimeRemaining, setRestTimeRemaining] = useState(0);
  
  const [exerciseLogs, setExerciseLogs] = useState<ExerciseLog[]>(() => 
    workout.exercises.map((ex, index) => ({
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

  const currentExercise = workout.exercises[currentExerciseIndex];
  const currentLog = exerciseLogs[currentExerciseIndex];
  const progress = ((currentExerciseIndex + (phase === 'rest' ? 0.5 : 0)) / workout.exercises.length) * 100;

  // Create session on mount
  useEffect(() => {
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

  // Global timer
  useEffect(() => {
    if (isPaused || phase === 'completed') return;
    const interval = setInterval(() => {
      setGlobalTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, phase]);

  // Phase timer (exercise or rest)
  useEffect(() => {
    if (isPaused || phase === 'completed') return;

    const interval = setInterval(() => {
      if (phase === 'exercise') {
        setPhaseTime(t => t + 1);
        // Update current exercise duration
        setExerciseLogs(logs => logs.map((log, i) => 
          i === currentExerciseIndex ? { ...log, duration_seconds: log.duration_seconds + 1 } : log
        ));
      } else if (phase === 'rest') {
        setRestTimeRemaining(t => {
          if (t <= 1) {
            // Auto-advance to next exercise
            handleNextExercise();
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, phase, currentExerciseIndex]);

  const handleStartRest = useCallback(() => {
    const restTime = currentLog?.rest_seconds || 60;
    setRestTimeRemaining(restTime);
    setPhase('rest');
    setPhaseTime(0);
  }, [currentLog]);

  const handleNextExercise = useCallback(() => {
    if (currentExerciseIndex >= workout.exercises.length - 1) {
      setPhase('completed');
      return;
    }
    setCurrentExerciseIndex(i => i + 1);
    setPhase('exercise');
    setPhaseTime(0);
    setRestTimeRemaining(0);
  }, [currentExerciseIndex, workout.exercises.length]);

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

      // Insert all exercise logs
      const logsToInsert = exerciseLogs.map(log => ({
        session_id: sessionId,
        user_id: session.user.id,
        ...log,
      }));

      const { error: logsError } = await supabase
        .from('workout_exercise_logs')
        .insert(logsToInsert);

      if (logsError) throw logsError;

      // Also log as an activity
      await supabase
        .from('activities')
        .insert({
          user_id: session.user.id,
          activity_type: 'musculation',
          duration_min: Math.round(globalTime / 60),
          notes: `${workout.workout_name} - ${exerciseLogs.filter(l => !l.skipped).length} exercices`,
        });

      toast.success('🎉 Séance enregistrée avec succès !');
      onComplete();
    } catch (error) {
      console.error('Error completing session:', error);
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleAbort = async () => {
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
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/80 backdrop-blur-xl">
        <Button variant="ghost" size="sm" onClick={handleAbort}>
          <X className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">Temps total</p>
          <p className="font-mono text-lg font-bold">{formatTime(globalTime)}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </Button>
      </div>

      {/* Progress */}
      <div className="px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>Exercice {currentExerciseIndex + 1}/{workout.exercises.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto min-h-0">
        {phase === 'exercise' ? (
          <>
            <button
              onClick={() => setViewingExerciseIndex(currentExerciseIndex)}
              className="h-32 w-32 rounded-2xl card-premium flex items-center justify-center mb-6 transition-all hover:border-primary/50 hover:shadow-glow-sm active:scale-95 relative group"
            >
              <ExerciseIcon className="h-24 w-24 text-primary" />
              <div className="absolute bottom-1 right-1 h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Info className="h-3 w-3 text-primary" />
              </div>
            </button>
            
            <h2 className="text-xl font-bold text-center mb-2">{currentExercise?.name}</h2>
            
            <div className="flex items-center gap-4 text-lg mb-6">
              <span className="text-primary font-semibold">{currentLog?.actual_sets} séries</span>
              <span className="text-muted-foreground">×</span>
              <span className="text-primary font-semibold">{currentLog?.actual_reps} reps</span>
            </div>
            
            <p className="text-muted-foreground mb-2">{currentLog?.actual_weight}</p>
            
            <div className="card-premium px-6 py-3 mb-8">
              <p className="font-mono text-3xl font-bold">{formatTime(phaseTime)}</p>
            </div>

            {/* Feedback Message */}
            {feedbackMessage && (
              <div className="mb-4 px-4 py-2 rounded-xl bg-primary/10 border border-primary/30 animate-fade-in">
                <p className="text-sm text-center">{feedbackMessage}</p>
              </div>
            )}

            {/* In-Flow Feedback Buttons */}
            <div className="mb-4 w-full max-w-xs">
              <p className="text-xs text-muted-foreground text-center mb-2">Comment te sens-tu ?</p>
              <ExerciseFeedbackButtons 
                onFeedback={handleFeedback} 
                isLoading={isProcessingFeedback}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setViewingExerciseIndex(currentExerciseIndex)}
              >
                <Info className="h-4 w-4 mr-2" />
                Voir l'exercice
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleEditExercise(currentExerciseIndex)}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="h-32 w-32 rounded-full bg-energy/20 border border-energy/30 flex items-center justify-center mb-6 animate-pulse shadow-glow-md">
              <Timer className="h-16 w-16 text-energy" />
            </div>
            
            <h2 className="text-xl font-bold text-center mb-2">Repos</h2>
            <p className="text-muted-foreground mb-6">Prochain : {workout.exercises[currentExerciseIndex + 1]?.name || 'Fin'}</p>
            
            <div className="card-premium px-8 py-4 mb-8 border-energy/30">
              <p className="font-mono text-4xl font-bold text-energy">{formatTime(restTimeRemaining)}</p>
            </div>

            {/* Button to preview next exercise during rest */}
            {workout.exercises[currentExerciseIndex + 1] && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewingExerciseIndex(currentExerciseIndex + 1)}
                className="text-muted-foreground"
              >
                <Info className="h-4 w-4 mr-2" />
                Voir l'exercice suivant
              </Button>
            )}
          </>
        )}
      </div>

      {/* Exercise list (collapsed) */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {workout.exercises.map((ex, index) => {
            const Icon = getExerciseIcon(ex.name);
            const isActive = index === currentExerciseIndex;
            const isDone = index < currentExerciseIndex;
            const log = exerciseLogs[index];
            
            return (
              <button
                key={index}
                onClick={() => !isDone && handleEditExercise(index)}
                className={`flex-shrink-0 p-2 rounded-lg border transition-all ${
                  isActive 
                    ? 'bg-primary/20 border-primary ring-2 ring-primary shadow-glow-sm' 
                    : isDone 
                      ? log?.skipped ? 'bg-muted/20 border-border/50 opacity-40' : 'bg-green-500/20 border-green-500/30' 
                      : 'bg-card border-border hover:border-primary/50'
                }`}
              >
                <Icon className="h-8 w-8" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer actions */}
      <div className="p-4 border-t border-border bg-card/80 backdrop-blur-xl flex gap-3">
        {phase === 'exercise' ? (
          <>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={handleSkipExercise}
            >
              <SkipForward className="h-5 w-5 mr-2" />
              Passer
            </Button>
            <Button 
              className="flex-1"
              onClick={handleStartRest}
            >
              <Check className="h-5 w-5 mr-2" />
              Terminé
            </Button>
          </>
        ) : (
          <Button 
            className="w-full"
            onClick={handleNextExercise}
          >
            <SkipForward className="h-5 w-5 mr-2" />
            Exercice suivant
          </Button>
        )}
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

      {/* Exercise Detail Sheet */}
      <ExerciseDetailSheet
        isOpen={viewingExerciseIndex !== null}
        onClose={() => setViewingExerciseIndex(null)}
        exerciseName={viewingExerciseIndex !== null ? workout.exercises[viewingExerciseIndex]?.name || '' : ''}
        sets={viewingExerciseIndex !== null ? exerciseLogs[viewingExerciseIndex]?.actual_sets : undefined}
        reps={viewingExerciseIndex !== null ? exerciseLogs[viewingExerciseIndex]?.actual_reps : undefined}
        weight={viewingExerciseIndex !== null ? exerciseLogs[viewingExerciseIndex]?.actual_weight : undefined}
        notes={viewingExerciseIndex !== null ? workout.exercises[viewingExerciseIndex]?.notes : undefined}
      />
    </div>
  );
};

export default ActiveWorkoutSession;

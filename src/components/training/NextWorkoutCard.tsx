import { useState, useEffect, useCallback } from 'react';
import { Dumbbell, Clock, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Play, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { getExerciseIcon } from './ExerciseIcons';
import { ActiveWorkoutSession } from './ActiveWorkoutSession';
import { ExerciseDetailSheet } from './ExerciseDetailSheet';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight_recommendation: string;
  rest_seconds: number;
  notes?: string;
}

export interface Workout {
  workout_name: string;
  target_muscles: string[];
  estimated_duration_min: number;
  exercises: Exercise[];
  warmup_notes: string;
  coach_advice: string;
}

const WORKOUT_STORAGE_KEY = 'prepared_workout';

interface NextWorkoutCardProps {
  externalWorkout?: Workout | null;
  onWorkoutGenerated?: (workout: Workout) => void;
}

export const NextWorkoutCard = ({ externalWorkout, onWorkoutGenerated }: NextWorkoutCardProps) => {
  const { user } = useAuth();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load saved workout from database
  const loadSavedWorkout = useCallback(async () => {
    if (!user) return null;

    try {
      const { data } = await supabase
        .from('user_context')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', WORKOUT_STORAGE_KEY)
        .maybeSingle();

      if (data?.value) {
        const parsed = JSON.parse(data.value);
        return parsed as Workout;
      }
    } catch (err) {
      console.error('Error loading saved workout:', err);
    }
    return null;
  }, [user]);

  // Save workout to database
  const saveWorkout = useCallback(async (workoutData: Workout) => {
    if (!user) return;

    try {
      await supabase
        .from('user_context')
        .upsert({
          user_id: user.id,
          key: WORKOUT_STORAGE_KEY,
          value: JSON.stringify(workoutData),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,key' });
    } catch (err) {
      console.error('Error saving workout:', err);
    }
  }, [user]);

  // Clear saved workout (after completing a session)
  const clearSavedWorkout = useCallback(async () => {
    if (!user) return;

    try {
      await supabase
        .from('user_context')
        .delete()
        .eq('user_id', user.id)
        .eq('key', WORKOUT_STORAGE_KEY);
    } catch (err) {
      console.error('Error clearing saved workout:', err);
    }
  }, [user]);

  // Generate new workout from API
  const generateNewWorkout = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Non connecté");
        setIsRefreshing(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('next-workout', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setWorkout(data);
      await saveWorkout(data);
      onWorkoutGenerated?.(data);
    } catch (err) {
      console.error("Error fetching workout:", err);
      setError("Impossible de générer la séance");
    } finally {
      setIsRefreshing(false);
    }
  }, [onWorkoutGenerated, saveWorkout]);

  // Use external workout if provided (from coach)
  useEffect(() => {
    if (externalWorkout) {
      setWorkout(externalWorkout);
      saveWorkout(externalWorkout);
      setIsLoading(false);
      setError(null);
    }
  }, [externalWorkout, saveWorkout]);

  // On mount: try to load saved workout first, only generate if none exists
  useEffect(() => {
    const initWorkout = async () => {
      if (externalWorkout) return; // Skip if external workout provided
      
      setIsLoading(true);
      
      // First, try to load saved workout
      const saved = await loadSavedWorkout();
      
      if (saved) {
        setWorkout(saved);
        setIsLoading(false);
      } else {
        // No saved workout, generate a new one
        await generateNewWorkout();
        setIsLoading(false);
      }
    };

    if (user) {
      initWorkout();
    }
  }, [user, externalWorkout, loadSavedWorkout, generateNewWorkout]);

  const handleRefresh = async () => {
    await generateNewWorkout();
  };

  const handleStartSession = () => {
    if (workout) {
      setIsSessionActive(true);
    }
  };

  const handleSessionComplete = async () => {
    setIsSessionActive(false);
    // Clear the saved workout after completing a session
    await clearSavedWorkout();
    // Generate a new workout for next time
    await generateNewWorkout();
  };

  // Show active session
  if (isSessionActive && workout) {
    return (
      <ActiveWorkoutSession 
        workout={workout}
        onClose={() => setIsSessionActive(false)}
        onComplete={handleSessionComplete}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-14 w-14 rounded-xl" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <h3 className="font-semibold text-foreground">Prochaine séance</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!workout) return null;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              <Dumbbell className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">{workout.workout_name}</h3>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleRefresh} 
            className="h-8 w-8"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            ~{workout.estimated_duration_min} min
          </span>
          <span className="flex flex-wrap gap-1">
            {workout.target_muscles.map((muscle, i) => (
              <span key={i} className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary capitalize">
                {muscle}
              </span>
            ))}
          </span>
        </div>
      </div>

      {/* Exercises */}
      <div className="p-4 space-y-3">
        {workout.exercises.slice(0, isExpanded ? undefined : 4).map((exercise, index) => {
          const ExerciseIcon = getExerciseIcon(exercise.name);
          return (
            <button
              key={index}
              onClick={() => setSelectedExercise(exercise)}
              className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 w-full text-left transition-all hover:bg-muted/50 hover:border-primary/30 border border-transparent active:scale-[0.98]"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <ExerciseIcon className="h-10 w-10" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{exercise.name}</p>
                <p className="text-xs text-muted-foreground">
                  {exercise.sets} × {exercise.reps} • {exercise.weight_recommendation}
                </p>
                {exercise.notes && (
                  <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{exercise.notes}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="text-xs text-muted-foreground text-right">
                  <span className="text-primary font-medium">{exercise.rest_seconds}s</span>
                  <p className="text-muted-foreground/70">repos</p>
                </div>
                <Info className="h-4 w-4 text-muted-foreground/50" />
              </div>
            </button>
          );
        })}

        {workout.exercises.length > 4 && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full text-muted-foreground">
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Voir moins
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Voir {workout.exercises.length - 4} exercices de plus
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        )}
      </div>

      {/* Start session button */}
      <div className="px-4 pb-4">
        <Button 
          className="w-full" 
          size="lg"
          onClick={handleStartSession}
        >
          <Play className="h-5 w-5 mr-2" />
          Lancer la séance
        </Button>
      </div>

      {/* Coach advice */}
      {workout.coach_advice && (
        <div className="px-4 pb-4">
          <div className="rounded-xl bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">
              💡 {workout.coach_advice}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NextWorkoutCard;

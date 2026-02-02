import { useState, useEffect } from 'react';
import { Dumbbell, Clock, RefreshCw, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Exercise {
  name: string;
  sets: number;
  reps: string;
  weight_recommendation: string;
  rest_seconds: number;
  notes?: string;
}

interface Workout {
  workout_name: string;
  target_muscles: string[];
  estimated_duration_min: number;
  exercises: Exercise[];
  warmup_notes: string;
  coach_advice: string;
}

// Exercise images mapping
const getExerciseImage = (exerciseName: string): string => {
  const name = exerciseName.toLowerCase();
  
  // Chest exercises
  if (name.includes("développé") || name.includes("bench") || name.includes("pec")) {
    return "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=100&h=100&fit=crop";
  }
  // Back exercises
  if (name.includes("tirage") || name.includes("rowing") || name.includes("pull") || name.includes("dos")) {
    return "https://images.unsplash.com/photo-1603287681836-b174ce5074c2?w=100&h=100&fit=crop";
  }
  // Leg exercises
  if (name.includes("squat") || name.includes("jambes") || name.includes("leg") || name.includes("presse")) {
    return "https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=100&h=100&fit=crop";
  }
  // Shoulder exercises
  if (name.includes("épaule") || name.includes("shoulder") || name.includes("élévation") || name.includes("military")) {
    return "https://images.unsplash.com/photo-1581009146145-b5ef050c149a?w=100&h=100&fit=crop";
  }
  // Arms
  if (name.includes("curl") || name.includes("biceps") || name.includes("triceps") || name.includes("bras")) {
    return "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=100&h=100&fit=crop";
  }
  // Core
  if (name.includes("abdo") || name.includes("planche") || name.includes("crunch") || name.includes("gainage")) {
    return "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop";
  }
  // Cardio
  if (name.includes("cardio") || name.includes("rameur") || name.includes("vélo") || name.includes("tapis")) {
    return "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=100&h=100&fit=crop";
  }
  
  // Default fitness image
  return "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=100&h=100&fit=crop";
};

export const NextWorkoutCard = () => {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchWorkout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("Non connecté");
        setIsLoading(false);
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
    } catch (err) {
      console.error("Error fetching workout:", err);
      setError("Impossible de générer la séance");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkout();
  }, []);

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
          <Button variant="ghost" size="sm" onClick={fetchWorkout}>
            <RefreshCw className="h-4 w-4" />
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
          <Button variant="ghost" size="icon" onClick={fetchWorkout} className="h-8 w-8">
            <RefreshCw className="h-4 w-4" />
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
        {workout.exercises.slice(0, isExpanded ? undefined : 4).map((exercise, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-xl bg-muted/30 p-3"
          >
            <img
              src={getExerciseImage(exercise.name)}
              alt={exercise.name}
              className="h-14 w-14 rounded-xl object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{exercise.name}</p>
              <p className="text-xs text-muted-foreground">
                {exercise.sets} × {exercise.reps} • {exercise.weight_recommendation}
              </p>
              {exercise.notes && (
                <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{exercise.notes}</p>
              )}
            </div>
            <div className="text-xs text-muted-foreground text-right">
              <span className="text-primary font-medium">{exercise.rest_seconds}s</span>
              <p className="text-muted-foreground/70">repos</p>
            </div>
          </div>
        ))}

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

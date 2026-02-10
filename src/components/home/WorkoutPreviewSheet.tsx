import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Clock, Dumbbell, ChevronDown, ChevronUp, Play, Info, RefreshCw } from 'lucide-react';
import { Workout } from '@/components/training/NextWorkoutCard';
import { getExerciseIcon } from '@/components/training/ExerciseIcons';
import { ExerciseDetailSheet } from '@/components/training/ExerciseDetailSheet';


interface WorkoutPreviewSheetProps {
  isOpen: boolean;
  onClose: () => void;
  workout: Workout | null;
  onStartWorkout: () => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

const WorkoutPreviewSheet = ({ 
  isOpen, 
  onClose, 
  workout, 
  onStartWorkout,
  onRefresh,
  isRefreshing 
}: WorkoutPreviewSheetProps) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<{
    name: string;
    sets: number;
    reps: string;
    weight_recommendation: string;
    notes?: string;
  } | null>(null);

  if (!workout) return null;

  const handleStartWorkout = () => {
    onClose();
    onStartWorkout();
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0 overflow-hidden flex flex-col">
          {/* Header with gradient */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-primary/10 to-primary/5 p-4 pr-12 border-b border-border/50">
            <SheetHeader className="text-left mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20">
                    <Dumbbell className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <SheetTitle className="text-lg">{workout.workout_name}</SheetTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>~{workout.estimated_duration_min} min</span>
                    </div>
                  </div>
                </div>
                {onRefresh && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={onRefresh}
                    disabled={isRefreshing}
                    className="h-8 w-8 mr-6"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </SheetHeader>
            
            {/* Target muscles */}
            <div className="flex flex-wrap gap-1">
              {workout.target_muscles.map((muscle, i) => (
                <span 
                  key={i} 
                  className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary capitalize"
                >
                  {muscle}
                </span>
              ))}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-4 pb-32">
            {/* Warmup notes */}
            {workout.warmup_notes && (
              <div className="mb-4 rounded-xl bg-energy/10 border border-energy/20 p-3">
                <p className="text-xs font-medium text-energy mb-1">🔥 Échauffement</p>
                <p className="text-sm text-foreground">{workout.warmup_notes}</p>
              </div>
            )}

            {/* Exercises list */}
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {workout.exercises.length} exercices
            </h3>
            
            <div className="space-y-2">
              {workout.exercises.slice(0, isExpanded ? undefined : 5).map((exercise, index) => {
                const ExerciseIcon = getExerciseIcon(exercise.name);
                return (
                  <button
                    key={index}
                    onClick={() => setSelectedExercise(exercise)}
                    className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 w-full text-left transition-all hover:bg-muted/50 hover:border-primary/30 border border-transparent active:scale-[0.98]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                      <ExerciseIcon className="h-8 w-8" />
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

              {workout.exercises.length > 5 && (
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
                          Voir {workout.exercises.length - 5} exercices de plus
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                </Collapsible>
              )}
            </div>

            {/* Coach advice */}
            {workout.coach_advice && (
              <div className="mt-4 rounded-xl bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">
                  💡 {workout.coach_advice}
                </p>
              </div>
            )}
          </div>

          {/* Fixed bottom action */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
            <Button 
              className="w-full shadow-glow-lg" 
              size="lg"
              onClick={handleStartWorkout}
            >
              <Play className="h-5 w-5 mr-2" />
              Lancer la séance
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Exercise Detail Sheet */}
      <ExerciseDetailSheet
        isOpen={selectedExercise !== null}
        onClose={() => setSelectedExercise(null)}
        exerciseName={selectedExercise?.name || ''}
        sets={selectedExercise?.sets}
        reps={selectedExercise?.reps}
        weight={selectedExercise?.weight_recommendation}
        notes={selectedExercise?.notes}
      />
    </>
  );
};

export default WorkoutPreviewSheet;

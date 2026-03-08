import { Dumbbell, TrendingUp, TrendingDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useExerciseProgression } from '@/hooks/queries/useProgressQueries';
import { Button } from '@/components/ui/button';
import ProgressChart from '@/components/progress/ProgressChart';

interface ExerciseProgressionSectionProps {
  userId: string | undefined;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const ExerciseProgressionSection = ({ userId }: ExerciseProgressionSectionProps) => {
  const navigate = useNavigate();
  const { data: exercises, isLoading } = useExerciseProgression(userId);

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <Dumbbell className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Progression Musculation</h2>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="rounded-xl border border-border bg-card p-4">
              <div className="h-5 w-40 rounded bg-muted animate-pulse mb-3" />
              <div className="h-4 w-24 rounded bg-muted animate-pulse mb-3" />
              <div className="h-36 rounded bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!exercises || exercises.length === 0) && (
        <div className="rounded-xl border border-border bg-card/50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Dumbbell className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Commence tes séances structurées pour suivre ta progression musculaire
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
          >
            <Dumbbell className="h-4 w-4 mr-1" />
            Lancer une séance
          </Button>
        </div>
      )}

      {/* Exercise cards */}
      {!isLoading && exercises && exercises.length > 0 && (
        <div className="space-y-4">
          {exercises.map(exercise => {
            const chartData = exercise.dataPoints.map(dp => ({
              date: dp.date,
              value: dp.weight,
            }));

            const isPositive = exercise.weightChange >= 0;

            return (
              <div
                key={exercise.exerciseName}
                className="rounded-xl border border-border bg-card p-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground text-sm">
                    {capitalize(exercise.exerciseName)}
                  </h3>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {exercise.totalSessions} sessions
                  </span>
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-lg font-bold text-primary">
                    {exercise.latestWeight}kg
                  </span>
                  <span
                    className={`flex items-center gap-0.5 text-xs font-medium ${
                      isPositive ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {isPositive ? '+' : ''}
                    {exercise.weightChange}%
                  </span>
                </div>

                {/* Chart */}
                <ProgressChart
                  data={chartData}
                  label={capitalize(exercise.exerciseName)}
                  unit="kg"
                  color="#8b5cf6"
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExerciseProgressionSection;

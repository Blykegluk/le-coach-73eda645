import { TrendingUp, TrendingDown, Target, Scale } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Profile } from '@/types/profile';

interface GoalProgressCardProps {
  profile: Profile | null;
  currentWeight: number | null;
}

const GoalProgressCard = ({ profile, currentWeight }: GoalProgressCardProps) => {
  const startWeight = profile?.weight_kg;
  const targetWeight = profile?.target_weight_kg;
  const goal = profile?.goal;

  // If no goal or weights, show placeholder
  if (!goal || !startWeight || !targetWeight) {
    return (
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Target className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Définis ton objectif</p>
            <p className="text-sm text-muted-foreground">
              Configure ton profil pour suivre ta progression
            </p>
          </div>
        </div>
      </div>
    );
  }

  const actualWeight = currentWeight ?? startWeight;
  const isWeightLoss = targetWeight < startWeight;
  const totalChange = Math.abs(targetWeight - startWeight);
  const currentChange = isWeightLoss 
    ? startWeight - actualWeight 
    : actualWeight - startWeight;
  
  // Calculate progress percentage (clamped between 0 and 100)
  const progressPercentage = totalChange > 0 
    ? Math.min(Math.max((currentChange / totalChange) * 100, 0), 100)
    : 0;

  const remainingKg = Math.abs(targetWeight - actualWeight);
  const hasReachedGoal = remainingKg < 0.5;

  // Goal label
  const getGoalLabel = () => {
    switch (goal) {
      case 'weight_loss': return 'Perte de poids';
      case 'fat_loss': return 'Perte de graisse';
      case 'muscle_gain': return 'Prise de muscle';
      case 'maintain': return 'Maintien';
      case 'recomposition': return 'Recomposition';
      case 'wellness': return 'Bien-être';
      default: return 'Objectif';
    }
  };

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isWeightLoss ? (
            <TrendingDown className="h-4 w-4 text-primary" />
          ) : (
            <TrendingUp className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm font-medium text-foreground">{getGoalLabel()}</span>
        </div>
        {hasReachedGoal ? (
          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600">
            🎉 Objectif atteint !
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Encore {remainingKg.toFixed(1)} kg
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <Progress value={progressPercentage} className="h-3" />
      </div>

      {/* Weight indicators */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5">
          <Scale className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Départ:</span>
          <span className="font-medium text-foreground">{startWeight} kg</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-primary">{actualWeight.toFixed(1)} kg</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-muted-foreground">Objectif:</span>
          <span className="font-medium text-foreground">{targetWeight} kg</span>
        </div>
      </div>
    </div>
  );
};

export default GoalProgressCard;

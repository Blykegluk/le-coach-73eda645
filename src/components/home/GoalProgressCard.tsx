import { TrendingUp, TrendingDown, Target, Scale, Percent } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Profile } from '@/types/profile';

interface GoalProgressCardProps {
  profile: Profile | null;
  currentWeight: number | null;
  currentBodyFat: number | null;
}

const GoalProgressCard = ({ profile, currentWeight, currentBodyFat }: GoalProgressCardProps) => {
  const startWeight = profile?.weight_kg;
  const targetWeight = profile?.target_weight_kg;
  const startBodyFat = profile?.current_body_fat_pct;
  const targetBodyFat = profile?.target_body_fat_pct;
  const goal = profile?.goal;

  // If no goal or weights, show placeholder
  if (!goal || !startWeight) {
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

  // Determine what metrics to track based on goal
  const trackWeight = goal !== 'maintain' && targetWeight && targetWeight !== startWeight;
  const trackBodyFat = targetBodyFat && startBodyFat && targetBodyFat !== startBodyFat;

  // Calculate weight progress
  const actualWeight = currentWeight ?? startWeight;
  const isWeightLoss = targetWeight ? targetWeight < startWeight : false;
  const weightTotalChange = targetWeight ? Math.abs(targetWeight - startWeight) : 0;
  const weightCurrentChange = targetWeight 
    ? (isWeightLoss ? startWeight - actualWeight : actualWeight - startWeight)
    : 0;
  const weightProgress = weightTotalChange > 0 
    ? Math.min(Math.max((weightCurrentChange / weightTotalChange) * 100, 0), 100)
    : 0;
  const weightRemaining = targetWeight ? Math.abs(targetWeight - actualWeight) : 0;
  const weightReached = weightRemaining < 0.5;

  // Calculate body fat progress
  const actualBodyFat = currentBodyFat ?? startBodyFat ?? 0;
  const isFatLoss = targetBodyFat ? targetBodyFat < (startBodyFat ?? 0) : false;
  const fatTotalChange = targetBodyFat && startBodyFat ? Math.abs(targetBodyFat - startBodyFat) : 0;
  const fatCurrentChange = targetBodyFat && startBodyFat
    ? (isFatLoss ? startBodyFat - actualBodyFat : actualBodyFat - startBodyFat)
    : 0;
  const fatProgress = fatTotalChange > 0 
    ? Math.min(Math.max((fatCurrentChange / fatTotalChange) * 100, 0), 100)
    : 0;
  const fatRemaining = targetBodyFat ? Math.abs(targetBodyFat - actualBodyFat) : 0;
  const fatReached = fatRemaining < 0.5;

  // Overall goal reached only if ALL tracked metrics are reached
  const hasReachedGoal = 
    (!trackWeight || weightReached) && 
    (!trackBodyFat || fatReached) &&
    (trackWeight || trackBodyFat); // At least one metric must be tracked

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

  // Determine trend icon
  const showDownTrend = goal === 'weight_loss' || goal === 'fat_loss' || 
    (goal === 'recomposition' && trackBodyFat) || (goal === 'maintain' && trackBodyFat);

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showDownTrend ? (
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
            En cours...
          </span>
        )}
      </div>

      {/* Weight progress - only if tracking weight */}
      {trackWeight && (
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Scale className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Poids</span>
            </div>
            {weightReached ? (
              <span className="text-green-600">✓ Atteint</span>
            ) : (
              <span className="text-muted-foreground">
                Encore {weightRemaining.toFixed(1)} kg
              </span>
            )}
          </div>
          <Progress value={weightProgress} className="h-2" />
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{startWeight} kg</span>
            <span className="font-semibold text-primary">{actualWeight.toFixed(1)} kg</span>
            <span>{targetWeight} kg</span>
          </div>
        </div>
      )}

      {/* Body fat progress - only if tracking body fat */}
      {trackBodyFat && (
        <div className="mb-1">
          <div className="mb-1 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Percent className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">Masse grasse</span>
            </div>
            {fatReached ? (
              <span className="text-green-600">✓ Atteint</span>
            ) : (
              <span className="text-muted-foreground">
                Encore {fatRemaining.toFixed(1)}%
              </span>
            )}
          </div>
          <Progress value={fatProgress} className="h-2" />
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{startBodyFat}%</span>
            <span className="font-semibold text-primary">{actualBodyFat.toFixed(1)}%</span>
            <span>{targetBodyFat}%</span>
          </div>
        </div>
      )}

      {/* Maintain goal - show current status */}
      {goal === 'maintain' && !trackBodyFat && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1.5">
            <Scale className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Poids actuel:</span>
          </div>
          <span className="font-semibold text-primary">{actualWeight.toFixed(1)} kg</span>
        </div>
      )}
    </div>
  );
};

export default GoalProgressCard;

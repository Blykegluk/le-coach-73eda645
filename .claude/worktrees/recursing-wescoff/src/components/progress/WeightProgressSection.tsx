import { useState } from 'react';
import { Scale } from 'lucide-react';
import { useWeightHistory } from '@/hooks/queries/useProgressQueries';
import { useProfile } from '@/hooks/useProfile';
import ProgressChart from '@/components/progress/ProgressChart';

interface WeightProgressSectionProps {
  userId: string | undefined;
}

const WeightProgressSection = ({ userId }: WeightProgressSectionProps) => {
  const [period, setPeriod] = useState<30 | 90>(90);
  const { data: weightData, isLoading } = useWeightHistory(userId, period);
  const { profile } = useProfile();

  const targetWeight = profile?.target_weight_kg ?? undefined;

  const chartData = (weightData ?? []).map(d => ({
    date: d.date,
    value: d.weight,
  }));

  const currentWeight = chartData.length > 0 ? chartData[chartData.length - 1].value : null;
  const difference =
    currentWeight != null && targetWeight != null
      ? Math.round((currentWeight - targetWeight) * 10) / 10
      : null;

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Poids</h2>
        </div>

        {/* Period toggle */}
        <div className="flex rounded-lg bg-muted p-0.5">
          <button
            onClick={() => setPeriod(30)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              period === 30
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            30j
          </button>
          <button
            onClick={() => setPeriod(90)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              period === 90
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            90j
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="h-36 rounded bg-muted animate-pulse" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && (!weightData || weightData.length === 0) && (
        <div className="rounded-xl border border-border bg-card/50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Scale className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            Renseigne ton poids regulierement pour suivre ton evolution
          </p>
        </div>
      )}

      {/* Chart + summary */}
      {!isLoading && weightData && weightData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <ProgressChart
            data={chartData}
            label="Poids"
            unit="kg"
            color="#3b82f6"
            targetValue={targetWeight}
          />

          {/* Summary below chart */}
          <div className="mt-3 flex items-center justify-between text-sm">
            <div>
              <p className="text-muted-foreground">Actuel</p>
              <p className="font-semibold text-foreground">
                {currentWeight != null ? `${currentWeight} kg` : '-'}
              </p>
            </div>
            {targetWeight != null && (
              <div className="text-center">
                <p className="text-muted-foreground">Objectif</p>
                <p className="font-semibold text-foreground">{targetWeight} kg</p>
              </div>
            )}
            {difference != null && (
              <div className="text-right">
                <p className="text-muted-foreground">Ecart</p>
                <p
                  className={`font-semibold ${
                    difference === 0
                      ? 'text-green-400'
                      : difference > 0
                        ? 'text-amber-400'
                        : 'text-green-400'
                  }`}
                >
                  {difference > 0 ? '+' : ''}
                  {difference} kg
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeightProgressSection;

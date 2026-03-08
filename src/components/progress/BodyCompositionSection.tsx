import { useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { useBodyCompositionHistory } from '@/hooks/queries/useProgressQueries';
import { Button } from '@/components/ui/button';
import ProgressChart from '@/components/progress/ProgressChart';
import QuickAddBodyComposition from './QuickAddBodyComposition';

interface BodyCompositionSectionProps {
  userId: string | undefined;
}

interface MetricRowProps {
  label: string;
  unit: string;
  lastValue: number | null;
  firstValue: number | null;
}

const MetricRow = ({ label, unit, lastValue, firstValue }: MetricRowProps) => {
  if (lastValue == null) return null;

  const change =
    firstValue != null && firstValue !== 0
      ? Math.round((lastValue - firstValue) * 10) / 10
      : null;

  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          {lastValue}
          {unit}
        </span>
        {change != null && change !== 0 && (
          <span
            className={`flex items-center gap-0.5 text-xs ${
              change > 0 ? 'text-amber-400' : 'text-green-400'
            }`}
          >
            {change > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {change > 0 ? '+' : ''}
            {change}
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

const BodyCompositionSection = ({ userId }: BodyCompositionSectionProps) => {
  const { data: bodyData, isLoading } = useBodyCompositionHistory(userId);
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  if (isLoading) return null;

  const hasData = bodyData && bodyData.length > 0;
  const first = hasData ? bodyData[0] : null;
  const last = hasData ? bodyData[bodyData.length - 1] : null;

  // Determine which metric to chart (prefer body_fat_pct, fallback to muscle_mass_kg)
  const chartMetric = hasData && bodyData.some(d => d.body_fat_pct != null)
    ? 'body_fat_pct'
    : hasData && bodyData.some(d => d.muscle_mass_kg != null)
      ? 'muscle_mass_kg'
      : null;

  const chartData = chartMetric && hasData
    ? bodyData
        .filter(d => d[chartMetric] != null)
        .map(d => ({
          date: d.date,
          value: d[chartMetric] as number,
        }))
    : [];

  const chartLabel = chartMetric === 'body_fat_pct' ? 'Masse grasse' : 'Masse musculaire';
  const chartUnit = chartMetric === 'body_fat_pct' ? '%' : 'kg';
  const chartColor = chartMetric === 'body_fat_pct' ? '#ef4444' : '#22c55e';

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Composition Corporelle</h2>
        <button
          onClick={() => setShowQuickAdd(true)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          aria-label="Ajouter une mesure"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Empty state */}
      {!hasData && (
        <div className="rounded-xl border border-border bg-card/50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Activity className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Ajoute ta première mesure pour suivre ta composition corporelle
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQuickAdd(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter une mesure
          </Button>
        </div>
      )}

      {/* Data state */}
      {hasData && first && last && (
        <div className="rounded-xl border border-border bg-card p-4">
          {/* Metric rows */}
          <div className="divide-y divide-border">
            <MetricRow
              label="Masse grasse"
              unit="%"
              lastValue={last.body_fat_pct}
              firstValue={first.body_fat_pct}
            />
            <MetricRow
              label="Masse musculaire"
              unit=" kg"
              lastValue={last.muscle_mass_kg}
              firstValue={first.muscle_mass_kg}
            />
            <MetricRow
              label="Hydratation"
              unit="%"
              lastValue={last.water_pct}
              firstValue={first.water_pct}
            />
          </div>

          {/* Chart for primary metric */}
          {chartData.length >= 2 && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">{chartLabel}</p>
              <ProgressChart
                data={chartData}
                label={chartLabel}
                unit={chartUnit}
                color={chartColor}
                height={120}
              />
            </div>
          )}

          {/* CTA */}
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4 text-muted-foreground"
            onClick={() => setShowQuickAdd(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter une mesure
          </Button>
        </div>
      )}

      {/* Quick add sheet */}
      <QuickAddBodyComposition
        isOpen={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        userId={userId}
      />
    </div>
  );
};

export default BodyCompositionSection;

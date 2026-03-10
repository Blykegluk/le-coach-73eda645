import { useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { useBodyCompositionHistory } from '@/hooks/queries/useProgressQueries';
import { Button } from '@/components/ui/button';
import ProgressChart from '@/components/progress/ProgressChart';
import QuickAddBodyComposition from './QuickAddBodyComposition';

interface BodyCompositionSectionProps {
  userId: string | undefined;
}

interface MetricConfig {
  key: string;
  label: string;
  unit: string;
  color: string;
  /** true = lower is better (green on decrease), false = higher is better */
  lowerIsBetter: boolean;
}

const ALL_METRICS: MetricConfig[] = [
  // Core metrics
  { key: 'weight_kg', label: 'Poids', unit: ' kg', color: '#6366f1', lowerIsBetter: true },
  { key: 'body_fat_pct', label: 'Masse grasse', unit: '%', color: '#ef4444', lowerIsBetter: true },
  { key: 'fat_mass_kg', label: 'Masse grasse (kg)', unit: ' kg', color: '#f87171', lowerIsBetter: true },
  { key: 'muscle_mass_kg', label: 'Masse musculaire', unit: ' kg', color: '#22c55e', lowerIsBetter: false },
  { key: 'skeletal_muscle_pct', label: 'Muscles squelettiques', unit: '%', color: '#4ade80', lowerIsBetter: false },
  { key: 'lean_mass_kg', label: 'Masse maigre', unit: ' kg', color: '#10b981', lowerIsBetter: false },
  // Water & protein
  { key: 'water_pct', label: 'Hydratation', unit: '%', color: '#3b82f6', lowerIsBetter: false },
  { key: 'protein_pct', label: 'Protéines', unit: '%', color: '#8b5cf6', lowerIsBetter: false },
  { key: 'protein_kg', label: 'Protéines (kg)', unit: ' kg', color: '#a78bfa', lowerIsBetter: false },
  // Bone & visceral
  { key: 'bone_mass_kg', label: 'Masse osseuse', unit: ' kg', color: '#94a3b8', lowerIsBetter: false },
  { key: 'visceral_fat_index', label: 'Graisse viscérale', unit: '', color: '#ef4444', lowerIsBetter: true },
  { key: 'subcutaneous_fat_pct', label: 'Graisse sous-cutanée', unit: '%', color: '#fb923c', lowerIsBetter: true },
  // Indices & derived
  { key: 'bmi', label: 'IMC', unit: '', color: '#f59e0b', lowerIsBetter: true },
  { key: 'bmr_kcal', label: 'Métabolisme basal', unit: ' kcal', color: '#06b6d4', lowerIsBetter: false },
  { key: 'body_age', label: 'Âge corporel', unit: ' ans', color: '#ec4899', lowerIsBetter: true },
  { key: 'standard_weight_kg', label: 'Poids idéal', unit: ' kg', color: '#64748b', lowerIsBetter: false },
];

interface MetricRowProps {
  label: string;
  unit: string;
  lastValue: number | null;
  firstValue: number | null;
  lowerIsBetter: boolean;
  isSelected: boolean;
  onClick: () => void;
}

const MetricRow = ({ label, unit, lastValue, firstValue, lowerIsBetter, isSelected, onClick }: MetricRowProps) => {
  if (lastValue == null) return null;

  const change =
    firstValue != null && firstValue !== 0
      ? Math.round((lastValue - firstValue) * 10) / 10
      : null;

  const isPositiveChange = change != null && change > 0;
  const isGood = change != null && change !== 0 && (lowerIsBetter ? change < 0 : change > 0);

  return (
    <div
      className={`flex items-center justify-between py-2.5 px-2 -mx-2 rounded-lg cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
      }`}
      onClick={onClick}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-foreground">
          {lastValue}
          {unit}
        </span>
        {change != null && change !== 0 && (
          <span
            className={`flex items-center gap-0.5 text-xs ${
              isGood ? 'text-green-400' : 'text-amber-400'
            }`}
          >
            {isPositiveChange ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {isPositiveChange ? '+' : ''}
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
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  if (isLoading) return null;

  const hasData = bodyData && bodyData.length > 0;
  const first = hasData ? bodyData[0] : null;
  const last = hasData ? bodyData[bodyData.length - 1] : null;

  // Determine which metrics have data (check across all entries, not just last)
  const availableMetrics = hasData
    ? ALL_METRICS.filter(m =>
        bodyData.some(d => (d as any)[m.key] != null)
      )
    : [];

  // Auto-select first metric with chart data if none selected
  const activeMetric = selectedMetric && availableMetrics.some(m => m.key === selectedMetric)
    ? availableMetrics.find(m => m.key === selectedMetric)!
    : availableMetrics.find(m =>
        hasData && bodyData.filter(d => (d as any)[m.key] != null).length >= 2
      ) || availableMetrics[0] || null;

  const chartData = activeMetric && hasData
    ? bodyData
        .filter(d => (d as any)[activeMetric.key] != null)
        .map(d => ({
          date: d.date,
          value: (d as any)[activeMetric.key] as number,
        }))
    : [];

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
          {/* Last measurement date */}
          <p className="text-xs text-muted-foreground mb-2">
            Dernière mesure : {new Date(last.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          {/* Dynamic metric rows — only show metrics that have data */}
          <div className="divide-y divide-border">
            {availableMetrics.map(metric => (
              <MetricRow
                key={metric.key}
                label={metric.label}
                unit={metric.unit}
                lastValue={(last as any)[metric.key]}
                firstValue={(first as any)[metric.key]}
                lowerIsBetter={metric.lowerIsBetter}
                isSelected={activeMetric?.key === metric.key}
                onClick={() => setSelectedMetric(metric.key)}
              />
            ))}
          </div>

          {/* Chart for selected metric */}
          {activeMetric && chartData.length >= 2 && (
            <div className="mt-4 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">{activeMetric.label}</p>
              <ProgressChart
                data={chartData}
                label={activeMetric.label}
                unit={activeMetric.unit.trim()}
                color={activeMetric.color}
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

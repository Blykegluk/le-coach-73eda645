import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useMetricHistory } from '@/hooks/queries/useMetricHistory';
import ProgressChart from '@/components/progress/ProgressChart';

interface StatHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  metricKey: string;
  title: string;
  unit: string;
  userId: string | undefined;
}

const StatHistorySheet = ({
  isOpen,
  onClose,
  metricKey,
  title,
  unit,
  userId,
}: StatHistorySheetProps) => {
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');
  const days = period === '7d' ? 7 : 30;
  const { data, isLoading } = useMetricHistory(userId, metricKey, days);

  // Compute summary values
  const currentValue = data.length > 0 ? data[data.length - 1].value : null;
  const average =
    data.length > 0
      ? Math.round((data.reduce((sum, d) => sum + d.value, 0) / data.length) * 10) / 10
      : null;
  const trend =
    data.length >= 2
      ? Math.round((data[data.length - 1].value - data[0].value) * 10) / 10
      : null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[60vh]">
        <SheetHeader className="pb-3">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>

        {/* Period toggle */}
        <div className="flex rounded-lg bg-muted p-0.5 mb-4 w-fit">
          <button
            onClick={() => setPeriod('7d')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              period === '7d'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            7 jours
          </button>
          <button
            onClick={() => setPeriod('30d')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              period === '30d'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            30 jours
          </button>
        </div>

        {/* Chart */}
        {isLoading ? (
          <div className="h-36 rounded-xl bg-muted animate-pulse" />
        ) : (
          <ProgressChart
            data={data}
            label={title}
            unit={unit}
            color="#8b5cf6"
            height={160}
          />
        )}

        {/* Summary */}
        {!isLoading && data.length > 0 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <div>
              <p className="text-muted-foreground">Actuel</p>
              <p className="font-semibold text-foreground">
                {currentValue} {unit}
              </p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground">Moyenne</p>
              <p className="font-semibold text-foreground">
                {average} {unit}
              </p>
            </div>
            {trend != null && (
              <div className="text-right">
                <p className="text-muted-foreground">Tendance</p>
                <p
                  className={`font-semibold ${
                    trend === 0
                      ? 'text-muted-foreground'
                      : trend > 0
                        ? 'text-green-400'
                        : 'text-red-400'
                  }`}
                >
                  {trend > 0 ? '+' : ''}
                  {trend} {unit}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && data.length === 0 && (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Pas de donnees pour cette periode
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default StatHistorySheet;

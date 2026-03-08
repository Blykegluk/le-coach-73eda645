import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';

interface ProgressChartProps {
  data: Array<{ date: string; value: number }>;
  label: string;
  unit: string;
  color?: string;
  targetValue?: number;
  height?: number;
}

// Format date as "DD/MM"
function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}

// Format date as "DD MMM"
function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  unit: string;
  labelText: string;
}

const CustomTooltip = ({ active, payload, label, unit, labelText }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0 || !label) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">{formatDateLong(label)}</p>
      <p className="text-sm font-semibold text-foreground">
        {payload[0].value} {unit}
      </p>
      <p className="text-xs text-muted-foreground">{labelText}</p>
    </div>
  );
};

const ProgressChart = ({
  data,
  label,
  unit,
  color = '#8b5cf6',
  targetValue,
  height = 144,
}: ProgressChartProps) => {
  const gradientId = useMemo(
    () => `gradient-${label.replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 8)}`,
    [label],
  );

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl bg-muted/30 text-sm text-muted-foreground"
        style={{ height }}
      >
        Pas encore de donnees
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        <XAxis
          dataKey="date"
          tickFormatter={formatDateShort}
          tick={{ fontSize: 10, fill: '#888' }}
          tickLine={false}
          axisLine={{ stroke: '#333' }}
          interval="preserveStartEnd"
        />

        <YAxis hide />

        <Tooltip
          content={<CustomTooltip unit={unit} labelText={label} />}
          cursor={{ stroke: '#555', strokeDasharray: '3 3' }}
        />

        {targetValue != null && (
          <ReferenceLine
            y={targetValue}
            stroke={color}
            strokeDasharray="6 3"
            strokeOpacity={0.5}
            label={{
              value: 'Objectif',
              position: 'right',
              fill: '#888',
              fontSize: 10,
            }}
          />
        )}

        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: color, stroke: '#1a1a1a', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default ProgressChart;

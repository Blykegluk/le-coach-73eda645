import { ReactNode } from "react";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: "energy" | "calories" | "water" | "sleep" | "heart";
}

const bgColorClasses = {
  energy: "bg-energy-light",
  calories: "bg-calories-light",
  water: "bg-water-light",
  sleep: "bg-sleep-light",
  heart: "bg-heart-light",
};

const iconColorClasses = {
  energy: "text-energy",
  calories: "text-calories",
  water: "text-water",
  sleep: "text-sleep",
  heart: "text-heart",
};

export const StatCard = ({ icon, label, value, unit, trend, color }: StatCardProps) => {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-card hover:shadow-soft transition-all duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <div className={`${bgColorClasses[color]} p-3 rounded-xl`}>
          <div className={iconColorClasses[color]}>
            {icon}
          </div>
        </div>
        {trend && (
          <span className={`text-sm font-medium ${trend.isPositive ? 'text-energy' : 'text-destructive'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold text-foreground">{value}</span>
        <span className="text-sm text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
};

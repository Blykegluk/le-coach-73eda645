interface GoalCardProps {
  title: string;
  current: number;
  target: number;
  unit: string;
  color: "energy" | "calories" | "water";
}

const progressColorClasses = {
  energy: "bg-energy",
  calories: "bg-calories",
  water: "bg-water",
};

const bgColorClasses = {
  energy: "bg-energy/20",
  calories: "bg-calories/20",
  water: "bg-water/20",
};

export const GoalCard = ({ title, current, target, unit, color }: GoalCardProps) => {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className="bg-card rounded-xl p-4 shadow-soft">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">
          {current.toLocaleString()}/{target.toLocaleString()} {unit}
        </span>
      </div>
      <div className={`h-2 rounded-full ${bgColorClasses[color]} overflow-hidden`}>
        <div 
          className={`h-full rounded-full ${progressColorClasses[color]} transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {percentage >= 100 ? '🎉 Objectif atteint !' : `${Math.round(percentage)}% complété`}
      </p>
    </div>
  );
};

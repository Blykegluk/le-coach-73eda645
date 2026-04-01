import { Flame, Beef, Wheat } from 'lucide-react';

interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  label: string;
  unit: string;
  showMax?: boolean;
}

const ProgressRing = ({ 
  value, 
  max, 
  size = 80, 
  strokeWidth = 6,
  color,
  bgColor,
  icon,
  label,
  unit,
  showMax = true,
}: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      {/* Ring */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90" width={size} height={size}>
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={bgColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center justify-center" style={{ color }}>
            {icon}
          </div>
        </div>
      </div>
      
      {/* Label and value */}
      <div className="mt-2 text-center">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">
          {value}{unit}
          {showMax && <span className="text-xs font-normal text-muted-foreground">/{max}</span>}
        </p>
      </div>
    </div>
  );
};

interface CircularProgressRingsProps {
  caloriesConsumed: number;
  caloriesGoal: number;
  proteinConsumed: number;
  proteinGoal: number;
  carbsConsumed: number;
  carbsGoal: number;
  onRingClick?: (ring: 'calories' | 'protein' | 'carbs') => void;
}

const CircularProgressRings = ({
  caloriesConsumed,
  caloriesGoal,
  proteinConsumed,
  proteinGoal,
  carbsConsumed,
  carbsGoal,
  onRingClick,
}: CircularProgressRingsProps) => {
  return (
    <div className="card-premium p-4 mb-4">
      <div className="flex items-center justify-around">
        {/* Calories Ring */}
        <button
          onClick={() => onRingClick?.('calories')}
          className="transition-transform active:scale-95 focus:outline-none"
        >
          <ProgressRing
            value={caloriesConsumed}
            max={caloriesGoal}
            color="hsl(var(--calories))"
            bgColor="hsl(var(--calories-light))"
            icon={<Flame className="h-5 w-5" />}
            label="Calories"
            unit=""
          />
        </button>

        {/* Protein Ring */}
        <button
          onClick={() => onRingClick?.('protein')}
          className="transition-transform active:scale-95 focus:outline-none"
        >
          <ProgressRing
            value={proteinConsumed}
            max={proteinGoal}
            color="hsl(var(--primary))"
            bgColor="hsl(var(--ring-background))"
            icon={<Beef className="h-5 w-5" />}
            label="Protéines"
            unit="g"
          />
        </button>

        {/* Carbs Ring */}
        <button
          onClick={() => onRingClick?.('carbs')}
          className="transition-transform active:scale-95 focus:outline-none"
        >
          <ProgressRing
            value={carbsConsumed}
            max={carbsGoal}
            color="hsl(var(--water))"
            bgColor="hsl(var(--water-light))"
            icon={<Wheat className="h-5 w-5" />}
            label="Glucides"
            unit="g"
          />
        </button>
      </div>
    </div>
  );
};

export default CircularProgressRings;

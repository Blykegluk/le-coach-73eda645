import { useEffect, useState } from "react";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color: "energy" | "calories" | "water" | "sleep";
  icon: React.ReactNode;
  label: string;
  value: string;
  target: string;
}

const colorClasses = {
  energy: "stroke-energy",
  calories: "stroke-calories",
  water: "stroke-water",
  sleep: "stroke-sleep",
};

const bgColorClasses = {
  energy: "bg-energy-light",
  calories: "bg-calories-light",
  water: "bg-water-light",
  sleep: "bg-sleep-light",
};

export const ProgressRing = ({
  progress,
  size = 120,
  strokeWidth = 10,
  color,
  icon,
  label,
  value,
  target,
}: ProgressRingProps) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (animatedProgress / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(Math.min(progress, 100));
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/50"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className={`${colorClasses[color]} transition-all duration-1000 ease-out`}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: offset,
            }}
          />
        </svg>
        {/* Center content */}
        <div className={`absolute inset-0 flex items-center justify-center ${bgColorClasses[color]} rounded-full m-3`}>
          <div className="text-foreground">
            {icon}
          </div>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">/ {target}</p>
      </div>
    </div>
  );
};

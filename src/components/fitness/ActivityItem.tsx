import { ReactNode } from "react";

interface ActivityItemProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  duration: string;
  calories: number;
  color: "energy" | "calories" | "water";
}

const bgColorClasses = {
  energy: "bg-energy-light",
  calories: "bg-calories-light",
  water: "bg-water-light",
};

const iconColorClasses = {
  energy: "text-energy",
  calories: "text-calories",
  water: "text-water",
};

export const ActivityItem = ({ icon, title, subtitle, duration, calories, color }: ActivityItemProps) => {
  return (
    <div className="flex items-center gap-4 p-4 bg-card rounded-xl shadow-soft hover:shadow-card transition-all duration-300 cursor-pointer group">
      <div className={`${bgColorClasses[color]} p-3 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
        <div className={iconColorClasses[color]}>
          {icon}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{title}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-foreground">{duration}</p>
        <p className="text-sm text-muted-foreground">{calories} kcal</p>
      </div>
    </div>
  );
};

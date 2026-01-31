import { Home, Activity, TrendingUp, User } from "lucide-react";
import { useState } from "react";

const navItems = [
  { icon: Home, label: "Accueil", id: "home" },
  { icon: Activity, label: "Activités", id: "activities" },
  { icon: TrendingUp, label: "Progrès", id: "progress" },
  { icon: User, label: "Profil", id: "profile" },
];

export const BottomNav = () => {
  const [active, setActive] = useState("home");

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-6 py-3 shadow-soft">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 ${
                isActive 
                  ? "text-primary bg-energy-light" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

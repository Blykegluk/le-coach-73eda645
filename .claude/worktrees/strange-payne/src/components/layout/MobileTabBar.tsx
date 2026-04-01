import { Home, CalendarDays, MessageCircle, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { id: 'home', path: '/', label: 'Accueil', icon: Home },
  { id: 'journal', path: '/journal', label: 'Journal', icon: CalendarDays },
  { id: 'coach', path: null, label: 'Coach', icon: MessageCircle },
  { id: 'profile', path: '/profile', label: 'Profil', icon: User },
];

interface MobileTabBarProps {
  onOpenCoach: () => void;
}

const MobileTabBar = ({ onOpenCoach }: MobileTabBarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="md:hidden safe-bottom relative flex items-center justify-around border-t border-border/50 bg-card/80 backdrop-blur-xl px-2 pt-2 pb-1">
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      {tabs.map((tab) => {
        const isActive = tab.path ? location.pathname === tab.path : false;
        const Icon = tab.icon;
        const isCoach = tab.id === 'coach';
        
        // Coach button - central floating button
        if (isCoach) {
          return (
            <button
              key={tab.id}
              onClick={onOpenCoach}
              className="relative flex flex-col items-center gap-0.5 -mt-5 transition-all duration-200"
            >
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-primary-glow shadow-glow-lg hover:scale-105 transition-all">
                <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/20" />
                <div className="absolute -inset-1 rounded-full bg-primary/30 animate-glow-pulse -z-10" />
                <Icon className="h-7 w-7 text-primary-foreground stroke-2" />
              </div>
              <span className="text-xs font-semibold mt-0.5 text-primary">
                {tab.label}
              </span>
            </button>
          );
        }
        
        // Regular tabs
        return (
          <button
            key={tab.id}
            onClick={() => tab.path && navigate(tab.path)}
            className={`relative flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-all duration-200 ${
              isActive 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className="relative">
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              {isActive && (
                <div className="absolute -inset-1 rounded-full bg-primary/20 blur-sm -z-10" />
              )}
            </div>
            <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
              {tab.label}
            </span>
            {isActive && (
              <div className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary shadow-glow-sm" />
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default MobileTabBar;

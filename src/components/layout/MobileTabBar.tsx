import { Home, TrendingUp, CalendarDays, MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const tabs = [
  { id: 'today', path: '/', label: "Aujourd'hui", icon: Home },
  { id: 'progress', path: '/progress', label: 'Progression', icon: TrendingUp },
  { id: 'journal', path: '/journal', label: 'Journal', icon: CalendarDays },
];

interface MobileTabBarProps {
  onOpenCoach: () => void;
}

const MobileTabBar = ({ onOpenCoach }: MobileTabBarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="md:hidden safe-bottom relative flex items-center border-t border-border/50 bg-card/80 backdrop-blur-xl px-2 pt-2 pb-1">
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      {/* 3 main tabs */}
      <div className="flex flex-1 items-center justify-around">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`relative flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors duration-200 ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                {isActive && (
                  <motion.div
                    layoutId="tab-glow"
                    className="absolute -inset-1 rounded-full bg-primary/20 blur-sm -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute -bottom-1 h-1 w-1 rounded-full bg-primary shadow-glow-sm"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Coach button — distinct, right side */}
      <button
        onClick={onOpenCoach}
        className="relative flex flex-col items-center gap-0.5 -mt-5 mr-2 transition-all duration-200"
      >
        <motion.div
          whileTap={{ scale: 0.92 }}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-primary-glow shadow-glow-lg hover:scale-105 transition-all"
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent to-white/20" />
          <div className="absolute -inset-1 rounded-full bg-primary/30 animate-glow-pulse -z-10" />
          <MessageCircle className="h-7 w-7 text-primary-foreground stroke-2" />
        </motion.div>
        <span className="text-xs font-semibold mt-0.5 text-primary">
          Coach
        </span>
      </button>
    </nav>
  );
};

export default MobileTabBar;

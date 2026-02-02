import { Home, Dumbbell, Apple, MessageCircle, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { id: 'home', path: '/', label: 'Accueil', icon: Home },
  { id: 'training', path: '/training', label: 'Training', icon: Dumbbell },
  { id: 'coach', path: '/coach', label: 'Coach', icon: MessageCircle },
  { id: 'nutrition', path: '/nutrition', label: 'Nutrition', icon: Apple },
  { id: 'profile', path: '/profile', label: 'Profil', icon: User },
];

const TabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="safe-bottom relative flex items-center justify-around border-t border-border/50 bg-card/80 backdrop-blur-xl px-2 pt-2 pb-1">
      {/* Top glow line */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        const Icon = tab.icon;
        const isCoach = tab.id === 'coach';
        
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`relative flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-all duration-200 ${
              isActive 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className={`relative ${isCoach && isActive ? 'rounded-full bg-primary p-1.5 shadow-glow-sm' : ''}`}>
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''} ${isCoach && isActive ? 'text-primary-foreground h-4 w-4' : ''}`} />
              {isActive && !isCoach && (
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

export default TabBar;

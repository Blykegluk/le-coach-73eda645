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
    <nav className="safe-bottom flex items-center justify-around border-t border-border bg-card px-2 pt-2 pb-1">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        const Icon = tab.icon;
        const isCoach = tab.id === 'coach';
        
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-all ${
              isActive 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <div className={`${isCoach && isActive ? 'rounded-full bg-primary p-1.5' : ''}`}>
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''} ${isCoach && isActive ? 'text-primary-foreground h-4 w-4' : ''}`} />
            </div>
            <span className={`text-[10px] font-medium ${isActive ? 'font-semibold' : ''}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default TabBar;

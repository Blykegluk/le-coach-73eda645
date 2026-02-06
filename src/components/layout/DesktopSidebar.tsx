import { Home, CalendarDays, MessageCircle, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const tabs = [
  { id: 'home', path: '/', label: 'Accueil', icon: Home },
  { id: 'journal', path: '/journal', label: 'Journal', icon: CalendarDays },
  { id: 'profile', path: '/profile', label: 'Profil', icon: User },
];

interface DesktopSidebarProps {
  onOpenCoach: () => void;
}

const DesktopSidebar = ({ onOpenCoach }: DesktopSidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border/50 bg-card/50 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-border/50">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-glow font-bold text-primary-foreground shadow-glow-sm">
          H
        </div>
        <span className="text-lg font-bold text-foreground">HealthLab</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
                isActive 
                  ? 'bg-primary/10 text-primary shadow-glow-sm' 
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`font-medium ${isActive ? 'font-semibold' : ''}`}>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Coach Button */}
      <div className="p-4 border-t border-border/50">
        <button
          onClick={onOpenCoach}
          className="w-full flex items-center gap-3 rounded-xl px-4 py-3 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground shadow-glow-md hover:shadow-glow-lg transition-all duration-200 hover:scale-[1.02]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="text-left">
            <span className="font-semibold block">Coach IA</span>
            <span className="text-xs text-primary-foreground/80">Discuter maintenant</span>
          </div>
        </button>
      </div>
    </aside>
  );
};

export default DesktopSidebar;

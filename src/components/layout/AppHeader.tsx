import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  logo?: boolean;
}

const AppHeader = ({ title, subtitle, logo }: AppHeaderProps) => {
  const navigate = useNavigate();
  const { profile } = useProfile();

  const initials = profile?.first_name?.[0]?.toUpperCase() || 'U';

  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        {logo ? (
          <img src="/logo.png" alt="The Perfect Coach" className="h-10" />
        ) : (
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <button
        onClick={() => navigate('/profile')}
        className="transition-transform active:scale-95"
      >
        <Avatar className="h-9 w-9 border-2 border-primary/30 shadow-glow-sm">
          <AvatarImage src={profile?.avatar_url ?? undefined} alt="Profil" />
          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </button>
    </div>
  );
};

export default AppHeader;

import { useNavigate } from 'react-router-dom';
import { Play, Utensils, Droplets, Moon, Dumbbell, ChevronRight, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SmartActionCardProps {
  preparedWorkout: {
    name: string;
    targetMuscles?: string[];
  } | null;
  onStartWorkout?: () => void;
  onOpenCoach?: () => void;
  onPreviewWorkout?: () => void;
}

type ActionType = 'workout' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'hydration' | 'sleep';

interface ActionConfig {
  type: ActionType;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  buttonText: string;
  gradient: string;
  iconBg: string;
}

const SmartActionCard = ({ preparedWorkout, onStartWorkout, onOpenCoach, onPreviewWorkout }: SmartActionCardProps) => {
  const navigate = useNavigate();
  
  // Determine the best action based on context
  const getContextualAction = (): ActionConfig => {
    const now = new Date();
    const hour = now.getHours();
    
    // If there's a prepared workout, prioritize it during active hours
    if (preparedWorkout && hour >= 6 && hour < 21) {
      const muscleText = preparedWorkout.targetMuscles?.slice(0, 2).join(' & ') || 'Full Body';
      return {
        type: 'workout',
        icon: <Play className="h-6 w-6" />,
        title: 'Lancer la séance',
        subtitle: `Focus ${muscleText}`,
        buttonText: 'Commencer',
        gradient: 'from-primary to-primary-glow',
        iconBg: 'bg-primary/20 text-primary',
      };
    }
    
    // Time-based meal suggestions
    if (hour >= 6 && hour < 10) {
      return {
        type: 'breakfast',
        icon: <Utensils className="h-6 w-6" />,
        title: 'Petit-déjeuner',
        subtitle: 'Commence ta journée avec énergie',
        buttonText: 'Enregistrer',
        gradient: 'from-energy to-energy/70',
        iconBg: 'bg-energy/20 text-energy',
      };
    }
    
    if (hour >= 11 && hour < 14) {
      return {
        type: 'lunch',
        icon: <Utensils className="h-6 w-6" />,
        title: 'Déjeuner',
        subtitle: 'Recharge tes batteries',
        buttonText: 'Enregistrer',
        gradient: 'from-primary to-primary-glow',
        iconBg: 'bg-primary/20 text-primary',
      };
    }
    
    if (hour >= 15 && hour < 17) {
      return {
        type: 'snack',
        icon: <Utensils className="h-6 w-6" />,
        title: 'Goûter',
        subtitle: 'Un boost pour l\'après-midi',
        buttonText: 'Enregistrer',
        gradient: 'from-energy to-energy/70',
        iconBg: 'bg-energy/20 text-energy',
      };
    }
    
    if (hour >= 18 && hour < 21) {
      return {
        type: 'dinner',
        icon: <Utensils className="h-6 w-6" />,
        title: 'Dîner',
        subtitle: 'Termine la journée en beauté',
        buttonText: 'Enregistrer',
        gradient: 'from-primary to-primary-glow',
        iconBg: 'bg-primary/20 text-primary',
      };
    }
    
    if (hour >= 21 || hour < 6) {
      return {
        type: 'sleep',
        icon: <Moon className="h-6 w-6" />,
        title: 'Bonne nuit',
        subtitle: 'La récupération commence',
        buttonText: 'Journal',
        gradient: 'from-sleep to-sleep/70',
        iconBg: 'bg-sleep/20 text-sleep',
      };
    }
    
    // Default: hydration reminder
    return {
      type: 'hydration',
      icon: <Droplets className="h-6 w-6" />,
      title: 'Hydratation',
      subtitle: 'N\'oublie pas de boire',
      buttonText: 'Ajouter',
      gradient: 'from-water to-water/70',
      iconBg: 'bg-water/20 text-water',
    };
  };
  
  const action = getContextualAction();
  
  const handleAction = () => {
    switch (action.type) {
      case 'workout':
        onStartWorkout?.();
        break;
      case 'breakfast':
      case 'lunch':
      case 'dinner':
      case 'snack':
        // Open coach to log meal
        onOpenCoach?.();
        break;
      case 'hydration':
        onOpenCoach?.();
        break;
      case 'sleep':
        navigate('/journal');
        break;
      default:
        navigate('/journal');
    }
  };
  
  return (
    <div className="relative overflow-hidden rounded-2xl mb-4">
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-10`} />
      
      {/* Glass overlay */}
      <div className="relative glass-card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Icon container */}
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${action.iconBg}`}>
              {action.icon}
            </div>
            
            {/* Text content */}
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {action.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {action.subtitle}
              </p>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2">
            {action.type === 'workout' && onPreviewWorkout && (
              <Button
                onClick={onPreviewWorkout}
                variant="outline"
                size="lg"
                className="rounded-xl"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            <Button
              onClick={handleAction}
              size="lg"
              className={`bg-gradient-to-r ${action.gradient} text-white font-semibold rounded-xl px-6 shadow-glow-sm hover:shadow-glow-md transition-all`}
            >
              {action.buttonText}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Workout-specific extras */}
        {action.type === 'workout' && preparedWorkout && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Dumbbell className="h-4 w-4" />
            <span>{preparedWorkout.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartActionCard;

import { Dumbbell, ChevronRight, Eye, Plus } from 'lucide-react';
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

const SmartActionCard = ({ preparedWorkout, onStartWorkout, onOpenCoach, onPreviewWorkout }: SmartActionCardProps) => {
  if (preparedWorkout) {
    return (
      <div className="mb-4">
        <div className="relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-glow opacity-10" />
          <div className="relative glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                <Dumbbell className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-foreground leading-tight">Lancer la séance</h2>
                <p className="text-xs text-muted-foreground truncate">
                  Focus {preparedWorkout.targetMuscles?.slice(0, 2).join(' & ') || 'Full Body'}
                </p>
              </div>
            </div>

            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Dumbbell className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{preparedWorkout.name}</span>
            </div>

            <div className="flex gap-2">
              {onPreviewWorkout && (
                <Button onClick={onPreviewWorkout} variant="outline" className="flex-1 rounded-xl h-10 text-sm gap-1.5">
                  <Eye className="h-4 w-4" />
                  Aperçu
                </Button>
              )}
              <Button
                onClick={onStartWorkout}
                className="flex-1 bg-gradient-to-r from-primary to-primary-glow text-white font-semibold rounded-xl h-10 text-sm shadow-glow-sm hover:shadow-glow-md transition-all"
              >
                Commencer
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No workout prepared — prompt to generate one
  return (
    <div className="mb-4">
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-glow opacity-10" />
        <div className="relative glass-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
              <Dumbbell className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground leading-tight">Ta séance du jour</h2>
              <p className="text-xs text-muted-foreground">Demande au coach de préparer ta séance</p>
            </div>
          </div>
          <Button
            onClick={onOpenCoach}
            className="w-full bg-gradient-to-r from-primary to-primary-glow text-white font-semibold rounded-xl h-10 text-sm shadow-glow-sm hover:shadow-glow-md transition-all"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Préparer une séance
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SmartActionCard;

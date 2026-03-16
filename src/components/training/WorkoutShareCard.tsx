import { useRef, useState } from 'react';
import { Share2, Loader2, Dumbbell, Clock, Flame, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureAndShare } from '@/lib/shareUtils';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';

interface WorkoutShareCardProps {
  workoutName: string;
  durationMin: number;
  exerciseCount: number;
  caloriesBurned?: number;
  prs?: string[];
}

export function WorkoutShareCard({
  workoutName,
  durationMin,
  exerciseCount,
  caloriesBurned,
  prs,
}: WorkoutShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsSharing(true);
    try {
      const success = await captureAndShare(
        cardRef.current,
        `Séance terminée : ${workoutName}`,
        `${workoutName} — ${durationMin}min, ${exerciseCount} exercices avec The Perfect Coach`,
      );
      if (success) {
        trackEvent('share_clicked', { type: 'workout' });
        toast.success('Image partagée !');
      }
    } catch {
      toast.error('Erreur lors du partage');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div>
      <div
        ref={cardRef}
        className="rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#0f3443] p-5 text-white"
        style={{ width: '100%', maxWidth: 400 }}
      >
        {/* Header */}
        <div className="mb-4 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
            <Dumbbell className="h-6 w-6 text-green-400" />
          </div>
          <h3 className="text-base font-bold">Séance terminée !</h3>
          <p className="text-sm text-white/70">{workoutName}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="flex items-center gap-1 text-blue-400">
              <Clock className="h-4 w-4" />
              <span className="text-lg font-bold">{durationMin}</span>
            </div>
            <p className="text-[10px] text-white/50">min</p>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 text-purple-400">
              <Dumbbell className="h-4 w-4" />
              <span className="text-lg font-bold">{exerciseCount}</span>
            </div>
            <p className="text-[10px] text-white/50">exercices</p>
          </div>
          {caloriesBurned != null && caloriesBurned > 0 && (
            <div className="text-center">
              <div className="flex items-center gap-1 text-orange-400">
                <Flame className="h-4 w-4" />
                <span className="text-lg font-bold">{caloriesBurned}</span>
              </div>
              <p className="text-[10px] text-white/50">kcal</p>
            </div>
          )}
        </div>

        {/* PRs */}
        {prs && prs.length > 0 && (
          <div className="mt-4 rounded-xl bg-yellow-500/10 p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-yellow-400" />
              <span className="text-xs font-semibold text-yellow-400">
                {prs.length} PR{prs.length > 1 ? 's' : ''} !
              </span>
            </div>
            {prs.map((pr, i) => (
              <p key={i} className="text-[11px] text-white/70">{pr}</p>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-center text-[10px] text-white/30">The Perfect Coach</p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleShare}
        disabled={isSharing}
        className="mt-3 w-full"
      >
        {isSharing ? (
          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
        ) : (
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
        )}
        Partager ma séance
      </Button>
    </div>
  );
}

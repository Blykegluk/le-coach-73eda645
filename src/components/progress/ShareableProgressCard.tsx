import { useRef, useState } from 'react';
import { Share2, Download, Loader2, Trophy, Flame, Dumbbell, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureAndShare, captureElement, shareImage } from '@/lib/shareUtils';
import { toast } from 'sonner';

interface ShareableProgressCardProps {
  userName: string;
  stats: {
    workoutsThisWeek?: number;
    totalWorkouts?: number;
    currentStreak?: number;
    weightChange?: number;
    prsThisMonth?: number;
  };
}

export function ShareableProgressCard({ userName, stats }: ShareableProgressCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setIsSharing(true);
    try {
      const success = await captureAndShare(
        cardRef.current,
        `${userName} — Progression`,
        `Mes stats fitness avec The Perfect Coach`,
      );
      if (success) toast.success('Image partagée !');
    } catch {
      toast.error('Erreur lors du partage');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsSharing(true);
    try {
      const blob = await captureElement(cardRef.current);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `progress-${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Image téléchargée !');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div>
      {/* The card that gets captured */}
      <div
        ref={cardRef}
        className="rounded-2xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-5 text-white"
        style={{ width: '100%', maxWidth: 400 }}
      >
        {/* Header */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-bold">{userName}</p>
            <p className="text-[10px] text-white/50">The Perfect Coach</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {stats.workoutsThisWeek != null && (
            <StatBlock
              icon={<Dumbbell className="h-4 w-4 text-blue-400" />}
              value={String(stats.workoutsThisWeek)}
              label="Séances cette semaine"
            />
          )}
          {stats.totalWorkouts != null && (
            <StatBlock
              icon={<Dumbbell className="h-4 w-4 text-purple-400" />}
              value={String(stats.totalWorkouts)}
              label="Séances totales"
            />
          )}
          {stats.currentStreak != null && stats.currentStreak > 0 && (
            <StatBlock
              icon={<Flame className="h-4 w-4 text-orange-400" />}
              value={`${stats.currentStreak}j`}
              label="Série en cours"
            />
          )}
          {stats.prsThisMonth != null && stats.prsThisMonth > 0 && (
            <StatBlock
              icon={<Trophy className="h-4 w-4 text-yellow-400" />}
              value={String(stats.prsThisMonth)}
              label="PRs ce mois"
            />
          )}
          {stats.weightChange != null && stats.weightChange !== 0 && (
            <StatBlock
              icon={<TrendingUp className="h-4 w-4 text-green-400" />}
              value={`${stats.weightChange > 0 ? '+' : ''}${stats.weightChange.toFixed(1)}kg`}
              label="Variation poids"
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-center text-[10px] text-white/30">theperfectcoachai.netlify.app</p>
        </div>
      </div>

      {/* Share buttons */}
      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          disabled={isSharing}
          className="flex-1"
        >
          {isSharing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Share2 className="mr-1.5 h-3.5 w-3.5" />
          )}
          Partager
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDownload}
          disabled={isSharing}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          Télécharger
        </Button>
      </div>
    </div>
  );
}

function StatBlock({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <span className="text-lg font-bold">{value}</span>
      </div>
      <p className="text-[10px] text-white/50 leading-tight">{label}</p>
    </div>
  );
}

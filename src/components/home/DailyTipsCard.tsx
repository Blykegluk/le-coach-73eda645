import { useState, useEffect } from 'react';
import { Lightbulb, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Tip {
  message: string;
  type: 'success' | 'suggestion' | 'reminder';
}

const DailyTipsCard = () => {
  const { user } = useAuth();
  const [tips, setTips] = useState<Tip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTips = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const { data, error: fnError } = await supabase.functions.invoke('daily-tips');

        if (fnError) {
          console.error('Error fetching tips:', fnError);
          setError('Impossible de charger les conseils');
          setTips(getDefaultTips());
          return;
        }

        if (data?.tips && Array.isArray(data.tips)) {
          setTips(data.tips);
        } else {
          setTips(getDefaultTips());
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Erreur de chargement');
        setTips(getDefaultTips());
      } finally {
        setIsLoading(false);
      }
    };

    fetchTips();
  }, [user]);

  const getDefaultTips = (): Tip[] => [
    { message: "Continue tes efforts, tu es sur la bonne voie ! 💪", type: 'suggestion' },
    { message: "Pense à bien t'hydrater tout au long de la journée 💧", type: 'reminder' },
    { message: "Chaque petite action compte vers ton objectif 🎯", type: 'suggestion' },
  ];

  if (!user) return null;

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-foreground">Conseils du jour</span>
        {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
      <div className="rounded-2xl bg-green-500/10 border border-green-500/20 p-3 space-y-2">
        {tips.map((tip, index) => (
          <div
            key={index}
            className="flex items-start gap-3 text-green-700 dark:text-green-400"
          >
            <div className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-green-500" />
            <p className="text-sm">{tip.message}</p>
          </div>
        ))}
        {tips.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">Aucun conseil disponible</p>
        )}
      </div>
    </div>
  );
};

export default DailyTipsCard;

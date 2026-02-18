import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getExerciseIcon } from './ExerciseIcons';

interface ExerciseDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  sets?: number;
  reps?: string;
  weight?: string;
  notes?: string;
}

interface ExerciseDetail {
  how_to: string;
  key_points: string[];
  muscles_targeted: string[];
  exercise_images: string[]; // base64 data URLs
  muscle_diagram: string | null; // base64 data URL
}

const CACHE_KEY_PREFIX = 'exercise_detail_v5_';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days (images are AI-generated, stable)

export const ExerciseDetailSheet = ({
  isOpen,
  onClose,
  exerciseName,
  sets,
  reps,
  weight,
}: ExerciseDetailSheetProps) => {
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ExerciseIcon = getExerciseIcon(exerciseName);

  useEffect(() => {
    if (!isOpen || !exerciseName) return;

    const cacheKey = `${CACHE_KEY_PREFIX}${exerciseName.toLowerCase().replace(/\s+/g, '_')}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
          setDetail(data);
          setError(null);
          return;
        }
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }

    fetchExerciseDetail();
  }, [isOpen, exerciseName]);

  const fetchExerciseDetail = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error: fnError } = await supabase.functions.invoke('exercise-detail', {
        body: { exerciseName },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setDetail(data);
      const cacheKey = `${CACHE_KEY_PREFIX}${exerciseName.toLowerCase().replace(/\s+/g, '_')}`;
      localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (err) {
      console.error('Error fetching exercise detail:', err);
      setError('Impossible de charger les détails');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="flex-shrink-0 p-5 pt-6 pb-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <ExerciseIcon className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{exerciseName}</h2>
              {(sets || reps || weight) && (
                <p className="text-sm text-muted-foreground">
                  {sets && `${sets} séries`} {reps && `× ${reps}`} {weight && `• ${weight}`}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-32 rounded" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="aspect-square rounded-2xl" />
                <Skeleton className="aspect-square rounded-2xl" />
              </div>
              <Skeleton className="h-6 w-40 rounded" />
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-10 w-10 text-destructive mb-3" />
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchExerciseDetail}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            </div>
          ) : detail ? (
            <>
              {/* Section 1: Exercise Positions (2 AI-generated illustrations) */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Comment faire
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {detail.exercise_images.length >= 2 ? (
                    detail.exercise_images.slice(0, 2).map((img, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-2xl bg-card border border-border overflow-hidden flex items-center justify-center p-2"
                      >
                        <img
                          src={img}
                          alt={`${exerciseName} - position ${i + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="aspect-square rounded-2xl bg-muted/40 border border-border flex items-center justify-center">
                        <ExerciseIcon className="h-16 w-16 text-muted-foreground/40" />
                      </div>
                      <div className="aspect-square rounded-2xl bg-muted/40 border border-border flex items-center justify-center">
                        <ExerciseIcon className="h-16 w-16 text-muted-foreground/40" />
                      </div>
                    </>
                  )}
                </div>
                <p className="text-center text-xs text-muted-foreground mt-2">
                  Position de départ → Position finale
                </p>
              </div>

              {/* Section 2: Muscle Diagram (1 AI-generated illustration) */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Muscles ciblés
                </p>
                {detail.muscle_diagram ? (
                  <div className="rounded-2xl bg-card border border-border overflow-hidden flex items-center justify-center p-3">
                    <img
                      src={detail.muscle_diagram}
                      alt={`Muscles ciblés - ${exerciseName}`}
                      className="w-full max-h-64 object-contain"
                    />
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {detail.muscles_targeted.map((muscle, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize"
                    >
                      {muscle}
                    </span>
                  ))}
                </div>
              </div>

              {/* Section 3: Brief Explanation */}
              <div className="rounded-2xl bg-muted/30 border border-border p-4 space-y-3">
                <p className="text-sm text-foreground leading-relaxed">
                  {detail.how_to}
                </p>
                <div className="border-t border-border pt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Points d'attention
                  </p>
                  <ul className="space-y-1.5">
                    {detail.key_points.map((point, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary font-bold text-xs mt-0.5">●</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ExerciseDetailSheet;

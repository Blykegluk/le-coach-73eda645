import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, RefreshCw, Info, Dumbbell, AlertCircle } from 'lucide-react';
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
  description: string;
  instructions: string[];
  muscles_targeted: string[];
  tips: string[];
  common_mistakes: string[];
  video_url?: string;
  media_type?: 'image' | 'video';
}

const CACHE_KEY_PREFIX = 'exercise_detail_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export const ExerciseDetailSheet = ({
  isOpen,
  onClose,
  exerciseName,
  sets,
  reps,
  weight,
  notes,
}: ExerciseDetailSheetProps) => {
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const ExerciseIcon = getExerciseIcon(exerciseName);

  // Load cached detail or fetch new one
  useEffect(() => {
    if (!isOpen || !exerciseName) return;

    const cacheKey = `${CACHE_KEY_PREFIX}${exerciseName.toLowerCase().replace(/\s+/g, '_')}`;
    
    // Check cache first
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

    // Fetch new detail
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
      
      // Cache the result
      const cacheKey = `${CACHE_KEY_PREFIX}${exerciseName.toLowerCase().replace(/\s+/g, '_')}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (err) {
      console.error('Error fetching exercise detail:', err);
      setError('Impossible de charger les détails de l\'exercice');
    } finally {
      setIsLoading(false);
    }
  };

  const generateVideo = async () => {
    setIsGeneratingVideo(true);
    setVideoError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error: fnError } = await supabase.functions.invoke('exercise-video', {
        body: { exerciseName },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      if (data?.video_url) {
        const mediaType = data.type === 'image' ? 'image' : 'video';
        setDetail(prev => prev ? { ...prev, video_url: data.video_url, media_type: mediaType } : null);
        
        // Update cache with media
        const cacheKey = `${CACHE_KEY_PREFIX}${exerciseName.toLowerCase().replace(/\s+/g, '_')}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          localStorage.setItem(cacheKey, JSON.stringify({
            data: { ...cachedData, video_url: data.video_url, media_type: mediaType },
            timestamp,
          }));
        }
      }
    } catch (err) {
      console.error('Error generating video:', err);
      setVideoError('Impossible de générer la vidéo');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <ExerciseIcon className="h-8 w-8 text-primary" />
            </div>
            <div className="text-left">
              <span className="block">{exerciseName}</span>
              {(sets || reps || weight) && (
                <span className="text-sm font-normal text-muted-foreground">
                  {sets && `${sets} séries`} {reps && `× ${reps}`} {weight && `• ${weight}`}
                </span>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-4 space-y-6 pb-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-48 w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-12 w-12 text-destructive mb-3" />
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={fetchExerciseDetail}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Réessayer
              </Button>
            </div>
          ) : detail ? (
            <>
              {/* Media section */}
              <div className="rounded-2xl overflow-hidden bg-muted/30 border border-border">
                {detail.video_url ? (
                  detail.media_type === 'video' ? (
                    <video
                      src={detail.video_url}
                      controls
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full aspect-video object-cover"
                    />
                  ) : (
                    <img
                      src={detail.video_url}
                      alt={`Démonstration de ${exerciseName}`}
                      className="w-full aspect-video object-cover"
                    />
                  )
                ) : (
                  <div className="aspect-video flex flex-col items-center justify-center p-6">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Play className="h-10 w-10 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground text-center mb-4">
                      Génère une image de démonstration de l'exercice
                    </p>
                    <Button 
                      onClick={generateVideo} 
                      disabled={isGeneratingVideo}
                      className="gap-2"
                    >
                      {isGeneratingVideo ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Génération en cours...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Générer l'image
                        </>
                      )}
                    </Button>
                    {videoError && (
                      <p className="text-xs text-destructive mt-2">{videoError}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Description
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {detail.description}
                </p>
              </div>

              {/* Muscles targeted */}
              {detail.muscles_targeted && detail.muscles_targeted.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-primary" />
                    Muscles ciblés
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {detail.muscles_targeted.map((muscle, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm capitalize"
                      >
                        {muscle}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {detail.instructions && detail.instructions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">📋 Instructions</h3>
                  <ol className="space-y-2">
                    {detail.instructions.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-medium flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="text-muted-foreground">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Tips */}
              {detail.tips && detail.tips.length > 0 && (
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4">
                  <h3 className="font-semibold text-green-600 dark:text-green-400 mb-2">💡 Conseils</h3>
                  <ul className="space-y-1">
                    {detail.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-green-500">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Common mistakes */}
              {detail.common_mistakes && detail.common_mistakes.length > 0 && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4">
                  <h3 className="font-semibold text-destructive mb-2">⚠️ Erreurs courantes</h3>
                  <ul className="space-y-1">
                    {detail.common_mistakes.map((mistake, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-destructive">•</span>
                        {mistake}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* User notes */}
              {notes && (
                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                  <h3 className="font-semibold text-primary mb-2">📝 Notes du coach</h3>
                  <p className="text-sm text-muted-foreground">{notes}</p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ExerciseDetailSheet;

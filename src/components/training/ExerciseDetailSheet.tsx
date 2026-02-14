import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Play, RefreshCw, Info, Dumbbell, AlertCircle, AlertTriangle, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getExerciseIcon } from './ExerciseIcons';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';

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
  safety_warnings?: string[];
  images?: string[];
  video_url?: string;
  media_type?: 'image' | 'video' | 'images';
}

const CACHE_KEY_PREFIX = 'exercise_detail_';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Detect injury-related instructions
const isInjuryRelated = (text: string): boolean => {
  const injuryKeywords = [
    'dos', 'lombaire', 'hernie', 'blessure', 'douleur', 'épaule', 'genou',
    'plaqué', 'neutre', 'protection', 'éviter', 'attention', 'prudence',
    'articulation', 'vertèbre', 'compression', 'tension', 'sécurité',
    'ne pas', 'ne jamais', 'dangereux', 'risque'
  ];
  const lowerText = text.toLowerCase();
  return injuryKeywords.some(keyword => lowerText.includes(keyword));
};

export const ExerciseDetailSheet = ({
  isOpen,
  onClose,
  exerciseName,
  sets,
  reps,
  weight,
  notes,
}: ExerciseDetailSheetProps) => {
  const { user } = useAuth();
  const [detail, setDetail] = useState<ExerciseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [userHealthAlerts, setUserHealthAlerts] = useState<string[]>([]);

  const ExerciseIcon = getExerciseIcon(exerciseName);

  // Fetch user health constraints
  const fetchHealthAlerts = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_context')
      .select('value')
      .eq('user_id', user.id)
      .like('key', 'health_%');
    
    if (data) {
      setUserHealthAlerts(data.map(d => d.value));
    }
  }, [user]);

  useEffect(() => {
    fetchHealthAlerts();
  }, [fetchHealthAlerts]);

  // Load cached detail or fetch new one
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

      if (data?.images) {
        setDetail(prev => prev ? { ...prev, images: data.images, media_type: 'images' } : null);
        
        const cacheKey = `${CACHE_KEY_PREFIX}${exerciseName.toLowerCase().replace(/\s+/g, '_')}`;
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { data: cachedData, timestamp } = JSON.parse(cached);
          localStorage.setItem(cacheKey, JSON.stringify({
            data: { ...cachedData, images: data.images, media_type: 'images' },
            timestamp,
          }));
        }
      } else if (data?.video_url) {
        const mediaType = data.type === 'image' ? 'image' : 'video';
        setDetail(prev => prev ? { ...prev, video_url: data.video_url, media_type: mediaType } : null);
        
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
      setVideoError('Impossible de générer les images');
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // Get the header media (first image or video)
  const headerMediaUrl = detail?.images?.[0] || detail?.video_url;
  const hasHeaderMedia = !!headerMediaUrl;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-hidden flex flex-col p-0">
        {/* Immersive Header with Video/Image Background */}
        <div className="relative flex-shrink-0">
          {/* Background Media */}
          <div className="absolute inset-0 h-48 overflow-hidden">
            {hasHeaderMedia ? (
              <>
                {detail?.media_type === 'video' ? (
                  <video
                    src={headerMediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={headerMediaUrl}
                    alt={exerciseName}
                    className="w-full h-full object-cover"
                  />
                )}
                {/* Dark overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-primary/20 to-background" />
            )}
          </div>

          {/* Header Content */}
          <div className="relative z-10 p-4 pt-6 h-48 flex flex-col justify-end">

            {/* Exercise title */}
            <div className="flex items-end gap-4">
              <div className="h-16 w-16 rounded-2xl bg-background/80 backdrop-blur-sm border border-border flex items-center justify-center shadow-lg">
                <ExerciseIcon className="h-10 w-10 text-primary" />
              </div>
              <div className="flex-1 pb-1">
                <h2 className="text-xl font-bold text-foreground drop-shadow-lg">{exerciseName}</h2>
                {(sets || reps || weight) && (
                  <p className="text-sm text-muted-foreground">
                    {sets && `${sets} séries`} {reps && `× ${reps}`} {weight && `• ${weight}`}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">
          {isLoading ? (
            <div className="space-y-4 pt-4">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
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
              {/* User Health Alert Banner */}
              {userHealthAlerts.length > 0 && (
                <div className="rounded-xl bg-energy/10 border-2 border-energy/40 p-4 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-energy flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-energy text-sm mb-1">Mode Adaptation Blessure</p>
                    <p className="text-xs text-muted-foreground">
                      Adapte l'exercice selon tes contraintes : {userHealthAlerts.join(', ')}
                    </p>
                  </div>
                </div>
              )}

              {/* Image Carousel (if available) */}
              {detail.images && detail.images.length > 0 && (
                <div className="rounded-2xl overflow-hidden bg-muted/30 border border-border p-3">
                  <div className="flex gap-1 mb-2 justify-center">
                    {['Départ', 'Mouvement', 'Fin'].map((label, i) => (
                      <span key={i} className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                        {i + 1}. {label}
                      </span>
                    ))}
                  </div>
                  <Carousel className="w-full">
                    <CarouselContent>
                      {detail.images.map((imgUrl, index) => (
                        <CarouselItem key={index} className="basis-1/3 pl-1">
                          <div className="aspect-[3/4] rounded-lg overflow-hidden border border-border">
                            <img
                              src={imgUrl}
                              alt={`${exerciseName} - étape ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                  </Carousel>
                </div>
              )}

              {/* Exercise pictogram */}
              {!detail.images && !detail.video_url && (
                <div className="rounded-2xl bg-muted/30 border border-border p-4 flex flex-col items-center">
                  <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                    <ExerciseIcon className="h-14 w-14 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">Pictogramme de l'exercice</p>
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Description
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{detail.description}</p>
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
                      <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm capitalize">
                        {muscle}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions with Injury Highlighting */}
              {detail.instructions && detail.instructions.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">📋 Instructions</h3>
                  <ol className="space-y-2">
                    {detail.instructions.map((step, i) => {
                      const isSafetyRelated = isInjuryRelated(step);
                      return (
                        <li 
                          key={i} 
                          className={`flex gap-3 text-sm p-2 rounded-lg transition-all ${
                            isSafetyRelated 
                              ? 'bg-destructive/10 border border-destructive/30' 
                              : ''
                          }`}
                        >
                          <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center ${
                            isSafetyRelated 
                              ? 'bg-destructive/20 text-destructive' 
                              : 'bg-primary/20 text-primary'
                          }`}>
                            {isSafetyRelated ? <AlertTriangle className="h-3 w-3" /> : i + 1}
                          </span>
                          <span className={isSafetyRelated ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                            {step}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              {/* Safety Warnings (dedicated section) */}
              {detail.safety_warnings && detail.safety_warnings.length > 0 && (
                <div className="rounded-xl bg-destructive/10 border-2 border-destructive/40 p-4">
                  <h3 className="font-semibold text-destructive mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Consignes de Sécurité
                  </h3>
                  <ul className="space-y-2">
                    {detail.safety_warnings.map((warning, i) => (
                      <li key={i} className="text-sm text-foreground flex gap-2">
                        <span className="text-destructive font-bold">!</span>
                        {warning}
                      </li>
                    ))}
                  </ul>
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

              {/* Coach notes */}
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

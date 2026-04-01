import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Loader2, Dumbbell, Target, Calendar, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useGenerateProgram } from '@/hooks/queries/useTrainingPrograms';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';

interface ProgramCreatorSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (programId: string) => void;
}

const GOALS = [
  { value: 'build_muscle', label: 'Prise de muscle', icon: '💪' },
  { value: 'lose_fat', label: 'Perte de gras', icon: '🔥' },
  { value: 'recomposition', label: 'Recomposition', icon: '⚡' },
  { value: 'general_fitness', label: 'Forme générale', icon: '🏃' },
];

const DIFFICULTIES = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
];

const DURATIONS = [
  { value: 4, label: '4 semaines' },
  { value: 6, label: '6 semaines' },
  { value: 8, label: '8 semaines' },
  { value: 12, label: '12 semaines' },
];

const SESSIONS = [
  { value: 2, label: '2x/sem' },
  { value: 3, label: '3x/sem' },
  { value: 4, label: '4x/sem' },
  { value: 5, label: '5x/sem' },
];

export function ProgramCreatorSheet({ isOpen, onOpenChange, onCreated }: ProgramCreatorSheetProps) {
  const { user } = useAuth();
  const generateProgram = useGenerateProgram(user?.id);

  const [goal, setGoal] = useState('build_muscle');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);

  const handleGenerate = async () => {
    try {
      const result = await generateProgram.mutateAsync({
        goal,
        difficulty,
        duration_weeks: durationWeeks,
        sessions_per_week: sessionsPerWeek,
      });

      trackEvent('program_created', { goal, difficulty, weeks: durationWeeks, sessions_per_week: sessionsPerWeek });
      toast.success('Programme créé !');
      onOpenChange(false);
      onCreated?.(result.program_id);
    } catch (err) {
      console.error('Error generating program:', err);
      toast.error('Erreur lors de la génération du programme');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            Nouveau programme
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto pb-8" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          {/* Goal */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Target className="h-4 w-4 text-muted-foreground" />
              Objectif
            </label>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${
                    goal === g.value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border bg-muted/30 text-foreground hover:bg-muted/50'
                  }`}
                >
                  <span className="mr-1.5">{g.icon}</span>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Zap className="h-4 w-4 text-muted-foreground" />
              Niveau
            </label>
            <div className="flex gap-2">
              {DIFFICULTIES.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDifficulty(d.value)}
                  className={`flex-1 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                    difficulty === d.value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border bg-muted/30 text-foreground hover:bg-muted/50'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Durée
            </label>
            <div className="flex gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d.value}
                  onClick={() => setDurationWeeks(d.value)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                    durationWeeks === d.value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border bg-muted/30 text-foreground hover:bg-muted/50'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sessions per week */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Dumbbell className="h-4 w-4 text-muted-foreground" />
              Séances / semaine
            </label>
            <div className="flex gap-2">
              {SESSIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setSessionsPerWeek(s.value)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm transition-colors ${
                    sessionsPerWeek === s.value
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border bg-muted/30 text-foreground hover:bg-muted/50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-muted/40 p-4">
            <p className="text-sm text-muted-foreground">
              Programme de <strong className="text-foreground">{durationWeeks} semaines</strong> avec{' '}
              <strong className="text-foreground">{sessionsPerWeek} séances/semaine</strong>
              {' '}= <strong className="text-foreground">{durationWeeks * sessionsPerWeek} séances</strong> au total
            </p>
          </div>
        </div>

        {/* Generate button */}
        <div className="border-t border-border pt-4">
          <Button
            onClick={handleGenerate}
            disabled={generateProgram.isPending}
            className="w-full"
            size="lg"
          >
            {generateProgram.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours…
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Générer le programme
              </>
            )}
          </Button>
          {generateProgram.isPending && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              L'IA crée ton programme personnalisé, ça peut prendre 15-30 secondes…
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

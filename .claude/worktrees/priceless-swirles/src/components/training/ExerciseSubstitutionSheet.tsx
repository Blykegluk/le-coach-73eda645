import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { getAlternatives } from '@/data/exerciseAlternatives';
import { getExerciseIcon } from './ExerciseIcons';
import { ArrowRightLeft } from 'lucide-react';

interface ExerciseSubstitutionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  exerciseName: string;
  onSelect: (newName: string) => void;
}

export const ExerciseSubstitutionSheet = ({
  isOpen,
  onClose,
  exerciseName,
  onSelect,
}: ExerciseSubstitutionSheetProps) => {
  const alternatives = getAlternatives(exerciseName);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[60vh]">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Remplacer {exerciseName}
          </SheetTitle>
        </SheetHeader>

        {alternatives.length > 0 ? (
          <div className="space-y-2 pb-4">
            {alternatives.map((alt) => {
              const Icon = getExerciseIcon(alt);
              return (
                <button
                  key={alt}
                  onClick={() => {
                    onSelect(alt);
                    onClose();
                  }}
                  className="flex items-center gap-3 w-full rounded-xl bg-muted/30 p-3 text-left transition-all hover:bg-muted/50 active:scale-[0.98] border border-transparent hover:border-primary/30"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-medium text-sm">{alt}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            Pas d'alternative disponible pour cet exercice.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
};

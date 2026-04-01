import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkoutTemplates, useRemoveWorkoutTemplate } from '@/hooks/queries/useWorkoutTemplates';
import { Workout } from './NextWorkoutCard';
import { Dumbbell, Trash2, Clock, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WorkoutTemplatesSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (workout: Workout) => void;
}

export const WorkoutTemplatesSheet = ({ isOpen, onClose, onSelect }: WorkoutTemplatesSheetProps) => {
  const { user } = useAuth();
  const { data: templates, isLoading } = useWorkoutTemplates(user?.id);
  const removeTemplate = useRemoveWorkoutTemplate();

  const handleSelect = (template: { workout_data: unknown }) => {
    const workout = template.workout_data as Workout;
    onSelect(workout);
    onClose();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeTemplate.mutate(id, {
      onSuccess: () => toast.success('Template supprimé'),
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Mes templates
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(70vh-100px)]">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="space-y-3 pr-4 pb-4">
              {templates.map((tpl) => {
                const workout = tpl.workout_data as unknown as Workout;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelect(tpl)}
                    className="flex items-center gap-3 w-full rounded-xl bg-muted/30 p-4 text-left transition-all hover:bg-muted/50 active:scale-[0.98] border border-transparent hover:border-primary/30"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                      <Dumbbell className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tpl.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {workout.exercises?.length || 0} exercices
                        {workout.estimated_duration_min && (
                          <span className="ml-2">
                            <Clock className="inline h-3 w-3 mr-0.5" />
                            ~{workout.estimated_duration_min} min
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {format(new Date(tpl.created_at), 'd MMM yyyy', { locale: fr })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive/70 hover:text-destructive"
                      onClick={(e) => handleDelete(tpl.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <BookOpen className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Aucun template sauvegardé</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Sauvegardez une séance pour la réutiliser plus tard
              </p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

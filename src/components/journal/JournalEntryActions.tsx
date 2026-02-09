import { useState } from 'react';
import { Trash2, Edit3, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface JournalEntry {
  id: string;
  type: 'workout' | 'meal' | 'water';
  title: string;
  subtitle?: string;
  mealType?: string;
  time: Date;
  meta?: string;
  status?: string;
  // Raw data for editing
  rawData?: Record<string, any>;
}

interface JournalEntryActionsProps {
  entry: JournalEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onEntryUpdated: () => void;
}

const JournalEntryActions = ({ entry, isOpen, onClose, onEntryUpdated }: JournalEntryActionsProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Record<string, any>>({});

  if (!entry) return null;

  const realId = entry.id.replace(/^(workout-|meal-|water-)/, '');

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (entry.type === 'workout') {
        // Delete exercise logs first, then the session
        await supabase.from('workout_exercise_logs').delete().eq('session_id', realId);
        const { error } = await supabase.from('workout_sessions').delete().eq('id', realId);
        if (error) throw error;
        toast.success('Séance supprimée');
      } else if (entry.type === 'meal') {
        const { error } = await supabase.from('nutrition_logs').delete().eq('id', realId);
        if (error) throw error;
        toast.success('Repas supprimé');
      }
      setShowDeleteConfirm(false);
      onClose();
      onEntryUpdated();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEdit = async () => {
    // Fetch current data for editing
    try {
      if (entry.type === 'workout') {
        const { data } = await supabase
          .from('workout_sessions')
          .select('workout_name, notes, total_duration_seconds')
          .eq('id', realId)
          .single();
        if (data) {
          setEditData({
            workout_name: data.workout_name,
            notes: data.notes || '',
            duration_min: data.total_duration_seconds ? Math.round(data.total_duration_seconds / 60) : '',
          });
        }
      } else if (entry.type === 'meal') {
        const { data } = await supabase
          .from('nutrition_logs')
          .select('food_name, calories, protein, carbs, fat')
          .eq('id', realId)
          .single();
        if (data) {
          setEditData({
            food_name: data.food_name,
            calories: data.calories || 0,
            protein: data.protein || 0,
            carbs: data.carbs || 0,
            fat: data.fat || 0,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching entry data:', err);
    }
    onClose();
    setShowEditSheet(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (entry.type === 'workout') {
        const { error } = await supabase
          .from('workout_sessions')
          .update({
            workout_name: editData.workout_name,
            notes: editData.notes || null,
            total_duration_seconds: editData.duration_min ? Number(editData.duration_min) * 60 : null,
          })
          .eq('id', realId);
        if (error) throw error;
        toast.success('Séance modifiée');
      } else if (entry.type === 'meal') {
        const { error } = await supabase
          .from('nutrition_logs')
          .update({
            food_name: editData.food_name,
            calories: Number(editData.calories) || 0,
            protein: Number(editData.protein) || 0,
            carbs: Number(editData.carbs) || 0,
            fat: Number(editData.fat) || 0,
          })
          .eq('id', realId);
        if (error) throw error;
        toast.success('Repas modifié');
      }
      setShowEditSheet(false);
      onEntryUpdated();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Action buttons sheet */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-left text-base">{entry.title}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 pb-4">
            {entry.type !== 'water' && (
              <Button
                variant="outline"
                className="justify-start gap-3 h-12"
                onClick={openEdit}
              >
                <Edit3 className="h-4 w-4 text-primary" />
                Modifier
              </Button>
            )}
            {entry.type !== 'water' && (
              <Button
                variant="outline"
                className="justify-start gap-3 h-12 text-destructive hover:text-destructive"
                onClick={() => { onClose(); setShowDeleteConfirm(true); }}
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              {entry.type === 'workout' 
                ? 'La séance et tous ses exercices seront supprimés définitivement.'
                : 'Ce repas sera supprimé définitivement.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit sheet */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left">
              {entry.type === 'workout' ? 'Modifier la séance' : 'Modifier le repas'}
            </SheetTitle>
          </SheetHeader>

          {entry.type === 'workout' ? (
            <div className="space-y-4 pb-6">
              <div>
                <Label htmlFor="workout_name">Nom de la séance</Label>
                <Input
                  id="workout_name"
                  value={editData.workout_name || ''}
                  onChange={(e) => setEditData(d => ({ ...d, workout_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="duration">Durée (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={editData.duration_min || ''}
                  onChange={(e) => setEditData(d => ({ ...d, duration_min: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={editData.notes || ''}
                  onChange={(e) => setEditData(d => ({ ...d, notes: e.target.value }))}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4 pb-6">
              <div>
                <Label htmlFor="food_name">Aliment</Label>
                <Input
                  id="food_name"
                  value={editData.food_name || ''}
                  onChange={(e) => setEditData(d => ({ ...d, food_name: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="calories">Calories</Label>
                  <Input
                    id="calories"
                    type="number"
                    value={editData.calories || ''}
                    onChange={(e) => setEditData(d => ({ ...d, calories: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="protein">Protéines (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    value={editData.protein || ''}
                    onChange={(e) => setEditData(d => ({ ...d, protein: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="carbs">Glucides (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    value={editData.carbs || ''}
                    onChange={(e) => setEditData(d => ({ ...d, carbs: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="fat">Lipides (g)</Label>
                  <Input
                    id="fat"
                    type="number"
                    value={editData.fat || ''}
                    onChange={(e) => setEditData(d => ({ ...d, fat: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setShowEditSheet(false)}>
              Annuler
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default JournalEntryActions;

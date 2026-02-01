import { useState } from 'react';
import { X, Target, Loader2 } from 'lucide-react';
import GoalAssistant from '@/components/onboarding/GoalAssistant';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

const GOALS = [
  { value: 'weight_loss', label: 'Perdre du poids', emoji: '🔥' },
  { value: 'fat_loss', label: 'Perdre en masse graisseuse', emoji: '🎯' },
  { value: 'muscle_gain', label: 'Prendre du muscle', emoji: '💪' },
  { value: 'maintain', label: 'Maintenir mon poids', emoji: '⚖️' },
  { value: 'recomposition', label: 'Recomposition corporelle', emoji: '🔄', description: 'Perdre du gras + gagner du muscle' },
  { value: 'wellness', label: 'Bien-être général', emoji: '🧘' },
];

interface GoalEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoal?: string | null;
  currentTargetWeight?: number | null;
}

export default function GoalEditorModal({
  isOpen,
  onClose,
  currentGoal,
  currentTargetWeight,
}: GoalEditorModalProps) {
  const { user } = useAuth();
  const { refetch } = useProfile();
  const [selectedGoal, setSelectedGoal] = useState<string | undefined>(currentGoal || undefined);
  const [targetWeight, setTargetWeight] = useState<number | undefined>(currentTargetWeight || undefined);
  const [customLabel, setCustomLabel] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!user || !selectedGoal) return;

    setIsSaving(true);
    try {
      const updates: Record<string, unknown> = {
        goal: selectedGoal,
        target_weight: targetWeight || null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Objectif mis à jour !');
      await refetch();
      onClose();
    } catch (err) {
      console.error('Error updating goal:', err);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
      <div 
        className="w-full max-w-md rounded-t-3xl bg-background p-6 sm:rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Modifier ton objectif</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Goal Assistant */}
        <GoalAssistant
          suggestions={GOALS}
          selectedGoal={selectedGoal}
          onSuggestionSelect={(value) => {
            setSelectedGoal(value);
            setCustomLabel(undefined);
          }}
          onGoalValidated={(goalCode, goalLabel, newTargetWeight) => {
            setSelectedGoal(goalCode);
            if (goalCode === 'custom') {
              setCustomLabel(goalLabel);
            }
            if (newTargetWeight) {
              setTargetWeight(newTargetWeight);
            }
          }}
        />

        {/* Save button */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-border bg-card py-3 font-semibold text-foreground transition-all hover:bg-muted/50"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedGoal || isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Enregistrer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

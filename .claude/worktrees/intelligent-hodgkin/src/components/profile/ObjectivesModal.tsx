import { useState } from 'react';
import { X, Target, Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface ObjectivesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ObjectivesModal({ isOpen, onClose }: ObjectivesModalProps) {
  const { profile, updateProfile } = useProfile();
  const [isSaving, setIsSaving] = useState(false);

  const [targetWeight, setTargetWeight] = useState(profile?.target_weight_kg?.toString() || '');
  const [targetCalories, setTargetCalories] = useState(profile?.target_calories?.toString() || '');
  const [targetProtein, setTargetProtein] = useState(profile?.target_protein?.toString() || '');
  const [targetCarbs, setTargetCarbs] = useState(profile?.target_carbs?.toString() || '');
  const [targetFat, setTargetFat] = useState(profile?.target_fat?.toString() || '');
  const [targetSteps, setTargetSteps] = useState(profile?.target_steps?.toString() || '');
  const [targetWater, setTargetWater] = useState(profile?.target_water_ml?.toString() || '');
  const [targetSleep, setTargetSleep] = useState(profile?.target_sleep_hours?.toString() || '');
  const [weeklyGoal, setWeeklyGoal] = useState(profile?.weekly_goal_kg?.toString() || '');

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await updateProfile({
        target_weight_kg: targetWeight ? Number(targetWeight) : null,
        target_calories: targetCalories ? Number(targetCalories) : null,
        target_protein: targetProtein ? Number(targetProtein) : null,
        target_carbs: targetCarbs ? Number(targetCarbs) : null,
        target_fat: targetFat ? Number(targetFat) : null,
        target_steps: targetSteps ? Number(targetSteps) : null,
        target_water_ml: targetWater ? Number(targetWater) : null,
        target_sleep_hours: targetSleep ? Number(targetSleep) : null,
        weekly_goal_kg: weeklyGoal ? Number(weeklyGoal) : null,
      });
      if (error) throw error;
      toast.success('Objectifs mis à jour !');
      onClose();
    } catch (err) {
      console.error('Error updating objectives:', err);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const fields = [
    { label: 'Poids cible (kg)', value: targetWeight, set: setTargetWeight, placeholder: '70', icon: '⚖️' },
    { label: 'Objectif hebdo (kg/sem)', value: weeklyGoal, set: setWeeklyGoal, placeholder: '-0.5', icon: '📉' },
    { label: 'Calories quotidiennes', value: targetCalories, set: setTargetCalories, placeholder: 'Auto', icon: '🔥' },
    { label: 'Protéines (g/jour)', value: targetProtein, set: setTargetProtein, placeholder: 'Auto', icon: '🥩' },
    { label: 'Glucides (g/jour)', value: targetCarbs, set: setTargetCarbs, placeholder: 'Auto', icon: '🍞' },
    { label: 'Lipides (g/jour)', value: targetFat, set: setTargetFat, placeholder: 'Auto', icon: '🥑' },
    { label: 'Pas quotidiens', value: targetSteps, set: setTargetSteps, placeholder: '10000', icon: '👟' },
    { label: 'Eau (ml/jour)', value: targetWater, set: setTargetWater, placeholder: '2000', icon: '💧' },
    { label: 'Sommeil (heures)', value: targetSleep, set: setTargetSleep, placeholder: '8', icon: '😴' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-background p-6 sm:rounded-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Mes objectifs</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {fields.map(f => (
            <div key={f.label} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3">
              <span className="text-xl">{f.icon}</span>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">{f.label}</Label>
                <Input
                  type="number"
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className="mt-0.5 rounded-lg border-0 bg-transparent p-0 text-base font-semibold text-foreground shadow-none focus-visible:ring-0 h-7"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1 rounded-xl">Annuler</Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex-1 rounded-xl">
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

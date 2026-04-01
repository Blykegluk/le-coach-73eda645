import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface QuickAddWeightProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
  lastKnownWeight?: number | null;
}

const QuickAddWeight = ({ isOpen, onClose, userId, lastKnownWeight }: QuickAddWeightProps) => {
  const [weight, setWeight] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleOpen = (open: boolean) => {
    if (open) {
      // Pre-fill with last known weight
      setWeight(lastKnownWeight ? String(lastKnownWeight) : '');
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum <= 0 || weightNum > 500) {
      toast.error('Poids invalide');
      return;
    }

    setIsSaving(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const { error } = await supabase
        .from('daily_metrics')
        .upsert(
          {
            user_id: userId,
            date: today,
            weight: weightNum,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,date' }
        );

      if (error) throw error;

      toast.success(`Poids enregistré : ${weightNum} kg`);
      onClose();
    } catch (err) {
      console.error('Error saving weight:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpen}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Poids du jour</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 pb-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">
              Poids actuel (kg)
            </label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              min="20"
              max="500"
              placeholder="Ex: 75.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="text-lg h-12"
              autoFocus
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={isSaving || !weight}
            className="w-full h-11 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuickAddWeight;

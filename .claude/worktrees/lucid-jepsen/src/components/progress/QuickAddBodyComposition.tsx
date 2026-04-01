import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuickAddBodyCompositionProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
}

interface FormState {
  weight_kg: string;
  body_fat_pct: string;
  muscle_mass_kg: string;
  water_pct: string;
  bmi: string;
  visceral_fat_index: string;
}

const EMPTY_FORM: FormState = {
  weight_kg: '',
  body_fat_pct: '',
  muscle_mass_kg: '',
  water_pct: '',
  bmi: '',
  visceral_fat_index: '',
};

const fields: Array<{ key: keyof FormState; label: string; unit: string; step: string; min: string; max: string }> = [
  { key: 'weight_kg', label: 'Poids', unit: 'kg', step: '0.1', min: '20', max: '500' },
  { key: 'body_fat_pct', label: 'Masse grasse', unit: '%', step: '0.1', min: '1', max: '80' },
  { key: 'muscle_mass_kg', label: 'Masse musculaire', unit: 'kg', step: '0.1', min: '1', max: '200' },
  { key: 'water_pct', label: 'Hydratation', unit: '%', step: '0.1', min: '1', max: '100' },
  { key: 'bmi', label: 'IMC', unit: '', step: '0.1', min: '10', max: '80' },
  { key: 'visceral_fat_index', label: 'Graisse viscérale', unit: '', step: '1', min: '1', max: '60' },
];

const QuickAddBodyComposition = ({ isOpen, onClose, userId }: QuickAddBodyCompositionProps) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const handleOpen = (open: boolean) => {
    if (open) {
      setForm(EMPTY_FORM);
    } else {
      onClose();
    }
  };

  const updateField = (key: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const hasAtLeastOneValue = Object.values(form).some(v => v.trim() !== '');

  const handleSave = async () => {
    if (!userId || !hasAtLeastOneValue) return;

    setIsSaving(true);
    try {
      const row: Record<string, unknown> = {
        user_id: userId,
        measured_at: new Date().toISOString(),
      };

      for (const { key } of fields) {
        const val = form[key].trim();
        if (val !== '') {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            row[key] = num;
          }
        }
      }

      const { error } = await supabase
        .from('body_composition')
        .insert(row as any);

      if (error) throw error;

      toast.success('Mesure enregistrée');
      onClose();
    } catch (err) {
      console.error('Error saving body composition:', err);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleOpen}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[75vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle>Nouvelle mesure</SheetTitle>
        </SheetHeader>

        <div className="space-y-3 pb-4">
          {fields.map(({ key, label, unit, step, min, max }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground w-32 flex-shrink-0">
                {label} {unit && <span className="text-xs">({unit})</span>}
              </label>
              <Input
                type="number"
                inputMode="decimal"
                step={step}
                min={min}
                max={max}
                placeholder="-"
                value={form[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className="h-10"
              />
            </div>
          ))}

          <Button
            onClick={handleSave}
            disabled={isSaving || !hasAtLeastOneValue}
            className="w-full h-11 mt-2 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold"
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuickAddBodyComposition;

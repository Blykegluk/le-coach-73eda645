import { useState } from 'react';
import { X, Apple, Loader2 } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface DietaryPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DIETS = [
  { value: 'omnivore', label: 'Omnivore', emoji: '🥩' },
  { value: 'vegetarian', label: 'Végétarien', emoji: '🥬' },
  { value: 'vegan', label: 'Végan', emoji: '🌱' },
  { value: 'pescatarian', label: 'Pescétarien', emoji: '🐟' },
  { value: 'keto', label: 'Keto', emoji: '🥑' },
  { value: 'paleo', label: 'Paléo', emoji: '🦴' },
  { value: 'gluten_free', label: 'Sans gluten', emoji: '🌾' },
  { value: 'lactose_free', label: 'Sans lactose', emoji: '🥛' },
  { value: 'halal', label: 'Halal', emoji: '☪️' },
  { value: 'kosher', label: 'Casher', emoji: '✡️' },
];

export default function DietaryPreferencesModal({ isOpen, onClose }: DietaryPreferencesModalProps) {
  const { user } = useAuth();
  const { profile, refetch } = useProfile();
  const [isSaving, setIsSaving] = useState(false);

  // Parse existing preferences
  const existingPrefs = (profile as any)?.dietary_preferences || [];
  const existingAllergies = (profile as any)?.allergies || '';

  const [selectedDiets, setSelectedDiets] = useState<string[]>(existingPrefs);
  const [allergies, setAllergies] = useState(existingAllergies);

  if (!isOpen) return null;

  const toggleDiet = (value: string) => {
    setSelectedDiets(prev =>
      prev.includes(value) ? prev.filter(d => d !== value) : [...prev, value]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          dietary_preferences: selectedDiets,
          allergies: allergies || null,
        } as Record<string, unknown>)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Préférences alimentaires mises à jour !');
      await refetch();
      onClose();
    } catch (err) {
      console.error('Error updating dietary preferences:', err);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-background p-6 sm:rounded-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Apple className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Préférences alimentaires</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Diet selection */}
        <div className="mb-5">
          <Label className="text-sm font-medium text-foreground">Régime alimentaire</Label>
          <p className="mb-3 text-xs text-muted-foreground">Sélectionne un ou plusieurs régimes</p>
          <div className="grid grid-cols-2 gap-2">
            {DIETS.map(diet => (
              <button
                key={diet.value}
                onClick={() => toggleDiet(diet.value)}
                className={`flex items-center gap-2 rounded-xl p-3 text-left text-sm font-medium transition-all ${
                  selectedDiets.includes(diet.value)
                    ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                    : 'bg-muted/30 text-foreground hover:bg-muted/50'
                }`}
              >
                <span className="text-lg">{diet.emoji}</span>
                <span className="truncate">{diet.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Allergies */}
        <div className="mb-2">
          <Label className="text-sm font-medium text-foreground">Allergies & intolérances</Label>
          <p className="mb-2 text-xs text-muted-foreground">Ex : arachides, crustacés, soja…</p>
          <Input
            value={allergies}
            onChange={e => setAllergies(e.target.value)}
            placeholder="Sépare par des virgules"
            className="rounded-xl"
          />
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

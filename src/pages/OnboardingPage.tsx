import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, User, Scale, Target, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import GoalAssistant from '@/components/onboarding/GoalAssistant';
import type { OnboardingData } from '@/types/profile';

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sédentaire', description: 'Peu ou pas d\'exercice' },
  { value: 'light', label: 'Légèrement actif', description: '1-2 jours/semaine' },
  { value: 'moderate', label: 'Actif', description: '3-5 jours/semaine' },
  { value: 'active', label: 'Très actif', description: '6-7 jours/semaine' },
  { value: 'very_active', label: 'Athlète', description: 'Entraînement intensif quotidien' },
];

const GOALS = [
  { value: 'weight_loss', label: 'Perdre du poids', emoji: '🔥' },
  { value: 'fat_loss', label: 'Perdre en masse graisseuse', emoji: '🎯' },
  { value: 'muscle_gain', label: 'Prendre du muscle', emoji: '💪' },
  { value: 'maintain', label: 'Maintenir mon poids', emoji: '⚖️' },
  { value: 'recomposition', label: 'Recomposition corporelle', emoji: '🔄', description: 'Perdre du gras + gagner du muscle' },
  { value: 'wellness', label: 'Bien-être général', emoji: '🧘' },
];

const GENDERS = [
  { value: 'male', label: 'Homme' },
  { value: 'female', label: 'Femme' },
  { value: 'other', label: 'Autre' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<OnboardingData> & { custom_goal_label?: string }>({
    first_name: '',
    birth_date: '',
    gender: undefined,
    height: undefined,
    weight: undefined,
    activity_level: undefined,
    goal: undefined,
    target_weight: undefined,
    custom_goal_label: undefined,
  });

  const updateField = <K extends keyof OnboardingData>(
    field: K,
    value: OnboardingData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateStep = (): boolean => {
    if (step === 1) {
      if (!formData.first_name?.trim()) {
        setError('Ton prénom est requis');
        return false;
      }
      if (!formData.birth_date) {
        setError('Ta date de naissance est requise');
        return false;
      }
      if (!formData.gender) {
        setError('Sélectionne ton genre');
        return false;
      }
      if (!formData.height || formData.height < 100 || formData.height > 250) {
        setError('Taille invalide (100-250 cm)');
        return false;
      }
    } else if (step === 2) {
      if (!formData.weight || formData.weight < 30 || formData.weight > 300) {
        setError('Poids invalide (30-300 kg)');
        return false;
      }
      if (!formData.activity_level) {
        setError('Sélectionne ton niveau d\'activité');
        return false;
      }
    } else if (step === 3) {
      if (!formData.goal) {
        setError('Sélectionne ton objectif');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    setStep(prev => Math.min(prev + 1, 3));
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    if (!user) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const profilePayload = {
        user_id: user.id,
        first_name: (formData.first_name || '').trim() || null,
        birth_date: formData.birth_date || null,
        gender: formData.gender || null,
        height_cm: formData.height ?? null,
        weight_kg: formData.weight ?? null,
        activity_level: formData.activity_level || null,
        goal: formData.goal || null,
        target_weight_kg: formData.target_weight ?? null,
        onboarding_complete: true,
      };

      // Upsert guarantees the row exists (update if present, insert otherwise)
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'user_id' });

      if (upsertError) {
        console.error('Error upserting profile:', upsertError);
        setError("Erreur lors de la sauvegarde. Réessaie.");
        return;
      }

      // Also set initial weight in daily_metrics
      const today = new Date().toISOString().split('T')[0];
      const { error: metricsError } = await supabase
        .from('daily_metrics')
        .upsert(
          {
            user_id: user.id,
            date: today,
            weight: formData.weight ?? null,
          },
          { onConflict: 'user_id,date' }
        );

      if (metricsError) {
        // Non-blocking, but log it so we can debug if needed
        console.error('Error upserting daily_metrics:', metricsError);
      }

      navigate('/', { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="mb-8 flex items-center justify-center gap-2">
      {[1, 2, 3].map(s => (
        <div
          key={s}
          className={`h-2 w-8 rounded-full transition-all ${
            s === step
              ? 'bg-primary'
              : s < step
              ? 'bg-primary/40'
              : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Qui es-tu ?</h2>
          <p className="text-sm text-muted-foreground">Parle-nous de toi</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="first_name">Prénom</Label>
          <Input
            id="first_name"
            placeholder="Ton prénom"
            value={formData.first_name || ''}
            onChange={e => updateField('first_name', e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="birth_date">Date de naissance</Label>
          <Input
            id="birth_date"
            type="date"
            value={formData.birth_date || ''}
            onChange={e => updateField('birth_date', e.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Genre</Label>
          <RadioGroup
            value={formData.gender}
            onValueChange={v => updateField('gender', v as OnboardingData['gender'])}
            className="mt-2 grid grid-cols-3 gap-2"
          >
            {GENDERS.map(g => (
              <Label
                key={g.value}
                htmlFor={g.value}
                className={`flex cursor-pointer items-center justify-center rounded-xl border p-3 transition-all ${
                  formData.gender === g.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value={g.value} id={g.value} className="sr-only" />
                <span className="font-medium">{g.label}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        <div>
          <Label htmlFor="height">Taille (cm)</Label>
          <Input
            id="height"
            type="number"
            placeholder="175"
            value={formData.height || ''}
            onChange={e => updateField('height', parseInt(e.target.value) || undefined)}
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Scale className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Où en es-tu ?</h2>
          <p className="text-sm text-muted-foreground">Ta situation actuelle</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="weight">Poids actuel (kg)</Label>
          <Input
            id="weight"
            type="number"
            step="0.1"
            placeholder="70"
            value={formData.weight || ''}
            onChange={e => updateField('weight', parseFloat(e.target.value) || undefined)}
            className="mt-1"
          />
        </div>

        <div>
          <Label>Niveau d'activité</Label>
          <RadioGroup
            value={formData.activity_level}
            onValueChange={v => updateField('activity_level', v as OnboardingData['activity_level'])}
            className="mt-2 space-y-2"
          >
            {ACTIVITY_LEVELS.map(level => (
              <Label
                key={level.value}
                htmlFor={level.value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition-all ${
                  formData.activity_level === level.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:bg-muted/50'
                }`}
              >
                <RadioGroupItem value={level.value} id={level.value} className="sr-only" />
                <div>
                  <p className="font-medium text-foreground">{level.label}</p>
                  <p className="text-sm text-muted-foreground">{level.description}</p>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Target className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Ton objectif</h2>
          <p className="text-sm text-muted-foreground">Choisis une suggestion ou décris ton objectif</p>
        </div>
      </div>

      <GoalAssistant
        suggestions={GOALS}
        selectedGoal={formData.goal}
        onSuggestionSelect={(value) => {
          updateField('goal', value as OnboardingData['goal']);
          setFormData(prev => ({ ...prev, custom_goal_label: undefined }));
        }}
        userContext={{
          weight: formData.weight,
          height: formData.height,
          activity_level: formData.activity_level,
        }}
        onGoalValidated={(goalCode, goalLabel, targetWeight) => {
          updateField('goal', goalCode as OnboardingData['goal']);
          if (goalCode === 'custom') {
            setFormData(prev => ({ ...prev, custom_goal_label: goalLabel }));
          }
          if (targetWeight) {
            updateField('target_weight', targetWeight);
          }
        }}
      />

      {/* Target weight input for weight-related goals */}
      {(formData.goal === 'weight_loss' || formData.goal === 'fat_loss') && !formData.target_weight && (
        <div className="pt-2">
          <Label htmlFor="target_weight">Poids cible (kg)</Label>
          <Input
            id="target_weight"
            type="number"
            step="0.1"
            placeholder="65"
            value={formData.target_weight || ''}
            onChange={e => updateField('target_weight', parseFloat(e.target.value) || undefined)}
            className="mt-1"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Objectif réaliste : {formData.weight ? `${((formData.weight as number) * 0.9).toFixed(0)} - ${((formData.weight as number) * 0.95).toFixed(0)} kg` : '...'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-background px-4 py-8 safe-top safe-bottom">
      <div className="mx-auto w-full max-w-md flex-1">
        {renderStepIndicator()}

        <Card className="border-none bg-transparent shadow-none">
          <CardContent className="p-0">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </CardContent>
        </Card>

        {error && (
          <p className="mt-4 text-center text-sm text-destructive">{error}</p>
        )}

        <div className="mt-8 flex gap-3">
          {step > 1 && (
            <button
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-4 font-semibold text-foreground transition-all hover:bg-muted/50 active:scale-[0.98] disabled:opacity-50"
            >
              <ChevronLeft className="h-5 w-5" />
              Retour
            </button>
          )}

          <button
            onClick={step === 3 ? handleSubmit : handleNext}
            disabled={isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-4 font-semibold text-primary-foreground transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : step === 3 ? (
              'Commencer 🚀'
            ) : (
              <>
                Suivant
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

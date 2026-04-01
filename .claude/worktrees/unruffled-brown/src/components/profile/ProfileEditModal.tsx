import { useState } from 'react';
import { X, User, Loader2, Camera } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileEditModal({ isOpen, onClose }: ProfileEditModalProps) {
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [isSaving, setIsSaving] = useState(false);

  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [lastName, setLastName] = useState(profile?.last_name || '');
  const [heightCm, setHeightCm] = useState(profile?.height_cm?.toString() || '');
  const [weightKg, setWeightKg] = useState(profile?.weight_kg?.toString() || '');
  const [birthDate, setBirthDate] = useState(profile?.birth_date || '');
  const [gender, setGender] = useState(profile?.gender || '');

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await updateProfile({
        first_name: firstName || null,
        last_name: lastName || null,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        birth_date: birthDate || null,
        gender: (gender as 'male' | 'female' | 'other') || null,
      });
      if (error) throw error;
      toast.success('Profil mis à jour !');
      onClose();
    } catch (err) {
      console.error('Error updating profile:', err);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const GENDERS = [
    { value: 'male', label: 'Homme' },
    { value: 'female', label: 'Femme' },
    { value: 'other', label: 'Autre' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div 
        className="w-full max-w-md rounded-t-3xl bg-background p-6 sm:rounded-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Mon profil</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Avatar */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent shadow-glow-md">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-primary-foreground" />
              )}
            </div>
            <button className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
              <Camera className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Prénom</Label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Prénom" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Nom</Label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Nom" className="mt-1 rounded-xl" />
            </div>
          </div>

          {/* Gender */}
          <div>
            <Label className="text-xs text-muted-foreground">Genre</Label>
            <div className="mt-1 flex gap-2">
              {GENDERS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGender(g.value)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-medium transition-all ${
                    gender === g.value
                      ? 'bg-primary text-primary-foreground shadow-glow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Birth date */}
          <div>
            <Label className="text-xs text-muted-foreground">Date de naissance</Label>
            <Input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="mt-1 rounded-xl" />
          </div>

          {/* Height / Weight */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Taille (cm)</Label>
              <Input type="number" value={heightCm} onChange={e => setHeightCm(e.target.value)} placeholder="175" className="mt-1 rounded-xl" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Poids (kg)</Label>
              <Input type="number" value={weightKg} onChange={e => setWeightKg(e.target.value)} placeholder="75" className="mt-1 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Buttons */}
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

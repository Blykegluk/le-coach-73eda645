import { useState } from 'react';
import { X, Bell } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NOTIFICATION_OPTIONS = [
  { key: 'meals', label: 'Rappels de repas', desc: 'Recevoir un rappel pour logger tes repas', emoji: '🍽️' },
  { key: 'workout', label: 'Rappels d\'entraînement', desc: 'Notification avant ta séance prévue', emoji: '💪' },
  { key: 'water', label: 'Rappels d\'hydratation', desc: 'Pense à boire régulièrement', emoji: '💧' },
  { key: 'progress', label: 'Résumé hebdomadaire', desc: 'Récap de tes progrès chaque semaine', emoji: '📊' },
  { key: 'tips', label: 'Tips du coach', desc: 'Conseils personnalisés quotidiens', emoji: '💡' },
];

export default function NotificationsModal({ isOpen, onClose }: NotificationsModalProps) {
  const { user } = useAuth();
  const { profile, refetch } = useProfile();
  
  const notificationsEnabled = (profile as any)?.notifications_enabled ?? true;
  const [enabled, setEnabled] = useState(notificationsEnabled);
  const [toggles, setToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_OPTIONS.map(o => [o.key, true]))
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const toggleOption = (key: string) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notifications_enabled: enabled } as Record<string, unknown>)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('Notifications mises à jour !');
      await refetch();
      onClose();
    } catch (err) {
      console.error('Error updating notifications:', err);
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
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Notifications</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Master toggle */}
        <div className="mb-5 flex items-center justify-between rounded-xl bg-muted/30 p-4">
          <div>
            <p className="font-semibold text-foreground">Activer les notifications</p>
            <p className="text-xs text-muted-foreground">Toutes les notifications de l'app</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative h-7 w-12 rounded-full transition-all duration-300 ${
              enabled ? 'bg-primary shadow-glow-sm' : 'bg-muted'
            }`}
          >
            <div className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ${
              enabled ? 'left-5.5' : 'left-0.5'
            }`} />
          </button>
        </div>

        {/* Individual toggles */}
        <div className="space-y-2">
          {NOTIFICATION_OPTIONS.map(opt => (
            <div
              key={opt.key}
              className={`flex items-center justify-between rounded-xl p-3 transition-all ${
                enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{opt.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </div>
              <button
                onClick={() => toggleOption(opt.key)}
                className={`relative h-6 w-10 rounded-full transition-all duration-300 ${
                  toggles[opt.key] ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300 ${
                  toggles[opt.key] ? 'left-4.5' : 'left-0.5'
                }`} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1 rounded-xl">Annuler</Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex-1 rounded-xl">
            {isSaving ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}

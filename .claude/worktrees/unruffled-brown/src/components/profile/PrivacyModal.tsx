import { useState } from 'react';
import { X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-background p-6 sm:rounded-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Confidentialité</h2>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-muted/20 p-4">
            <h3 className="mb-1 font-semibold text-foreground">🔒 Tes données t'appartiennent</h3>
            <p className="text-sm text-muted-foreground">
              Toutes tes données personnelles, de santé et de nutrition sont chiffrées et stockées de manière sécurisée. Seul toi y as accès.
            </p>
          </div>

          <div className="rounded-xl bg-muted/20 p-4">
            <h3 className="mb-1 font-semibold text-foreground">🤖 IA et confidentialité</h3>
            <p className="text-sm text-muted-foreground">
              Les conversations avec le coach IA sont utilisées uniquement pour personnaliser tes recommandations. Elles ne sont jamais partagées avec des tiers.
            </p>
          </div>

          <div className="rounded-xl bg-muted/20 p-4">
            <h3 className="mb-1 font-semibold text-foreground">🗑️ Droit à l'oubli</h3>
            <p className="text-sm text-muted-foreground">
              Tu peux demander la suppression complète de ton compte et de toutes tes données à tout moment en contactant le support.
            </p>
          </div>

          <div className="rounded-xl bg-muted/20 p-4">
            <h3 className="mb-1 font-semibold text-foreground">📍 Aucun tracking</h3>
            <p className="text-sm text-muted-foreground">
              Nous n'utilisons aucun outil de tracking publicitaire. Aucune donnée n'est vendue ou partagée.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Button onClick={onClose} variant="outline" className="w-full rounded-xl">Fermer</Button>
        </div>
      </div>
    </div>
  );
}

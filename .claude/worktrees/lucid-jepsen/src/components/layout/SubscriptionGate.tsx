import { Navigate, Outlet } from 'react-router-dom';
import { Loader2, Lock, CreditCard, Sparkles, RefreshCw, WifiOff } from 'lucide-react';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { Button } from '@/components/ui/button';

/**
 * Blocks access to the app if the user's trial has expired and they have no active subscription.
 */
export default function SubscriptionGate() {
  const { isLoading, hasAccess, timedOut, isInTrial, trialDaysRemaining, startCheckout, checkSubscription } = useSubscription();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Subscription check timed out — show retry UI (fail-closed)
  if (timedOut) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-6">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <WifiOff className="h-7 w-7 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Connexion lente</h2>
          <p className="text-sm text-muted-foreground">
            Impossible de vérifier ton abonnement. Vérifie ta connexion internet et réessaie.
          </p>
          <Button onClick={checkSubscription} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Période d'essai terminée</h1>
          <p className="text-muted-foreground">
            Votre essai gratuit de 14 jours est terminé. Abonnez-vous pour continuer à utiliser The Perfect Coach.
          </p>
          <div className="card-premium p-6 space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold text-foreground">9,90€/mois</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2 text-left">
              <li>✓ Coach IA personnalisé illimité</li>
              <li>✓ Plans d'entraînement sur mesure</li>
              <li>✓ Suivi nutritionnel avec analyse photo</li>
              <li>✓ Suivi de progression complet</li>
            </ul>
            <Button variant="premium" className="w-full" onClick={startCheckout}>
              <CreditCard className="h-4 w-4 mr-2" />
              S'abonner maintenant
            </Button>
          </div>
          <button
            onClick={checkSubscription}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            J'ai déjà payé ? Rafraîchir
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}

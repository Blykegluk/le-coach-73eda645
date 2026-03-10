import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionState {
  isLoading: boolean;
  subscribed: boolean;
  isInTrial: boolean;
  trialDaysRemaining: number;
  subscriptionEnd: string | null;
  hasAccess: boolean; // true if subscribed OR in trial
}

interface SubscriptionContextType extends SubscriptionState {
  checkSubscription: () => Promise<void>;
  startCheckout: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    isLoading: true,
    subscribed: false,
    isInTrial: true,
    trialDaysRemaining: 14,
    subscriptionEnd: null,
    hasAccess: true,
  });

  // Use a ref for the access token so checkSubscription doesn't recreate
  // on every TOKEN_REFRESHED event (which updates session.access_token).
  const tokenRef = useRef(session?.access_token);
  tokenRef.current = session?.access_token;

  const checkSubscription = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (error) throw error;

      const subscribed = data?.subscribed ?? false;
      const isInTrial = data?.is_in_trial ?? false;
      const trialDaysRemaining = data?.trial_days_remaining ?? 0;

      setState({
        isLoading: false,
        subscribed,
        isInTrial,
        trialDaysRemaining,
        subscriptionEnd: data?.subscription_end ?? null,
        hasAccess: subscribed || isInTrial,
      });
    } catch (err) {
      console.error('Error checking subscription:', err);
      // On error, be permissive (allow access)
      setState(prev => ({ ...prev, isLoading: false, hasAccess: true }));
    }
  }, []); // stable — reads token from ref

  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setState({
        isLoading: false,
        subscribed: false,
        isInTrial: false,
        trialDaysRemaining: 0,
        subscriptionEnd: null,
        hasAccess: false,
      });
    }
  }, [user, checkSubscription]);

  // Periodic refresh every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const startCheckout = async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error starting checkout:', err);
    }
  };

  const openCustomerPortal = async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err) {
      console.error('Error opening portal:', err);
    }
  };

  return (
    <SubscriptionContext.Provider value={{ ...state, checkSubscription, startCheckout, openCustomerPortal }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}

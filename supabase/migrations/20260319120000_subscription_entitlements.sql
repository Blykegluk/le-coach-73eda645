-- Subscription entitlements table for RevenueCat integration
-- Caches the user's current subscription tier for fast server-side checks
-- Absence of a row = trial tier (7-day free trial, 10 msgs/day)

CREATE TABLE public.subscription_entitlements (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'trial'
    CHECK (tier IN ('trial', 'essential', 'pro', 'unlimited')),
  daily_message_limit INTEGER NOT NULL DEFAULT 10,
  revenuecat_app_user_id TEXT,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscription_entitlements ENABLE ROW LEVEL SECURITY;

-- Users can read their own entitlement
CREATE POLICY "Users read own entitlement"
  ON public.subscription_entitlements FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for authenticated role
-- Only service role (edge functions) can write

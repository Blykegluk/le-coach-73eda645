-- Fix testers RLS: the old USING(false) policy was meant to restrict client access
-- but the intent is clearer with a proper check. Service role bypasses RLS anyway,
-- but this makes the policy self-documenting.
DROP POLICY IF EXISTS "Service role only" ON public.testers;

-- No client-side access needed; service_role bypasses RLS.
-- This policy exists only so RLS stays enabled without blocking service_role.
CREATE POLICY "No direct client access"
ON public.testers
FOR ALL
USING (false);

-- Also normalize emails to lowercase for case-insensitive matching
UPDATE public.testers SET email = lower(email);


CREATE TABLE public.testers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.testers ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write (used by edge functions)
CREATE POLICY "Service role only" ON public.testers
  FOR ALL USING (false);

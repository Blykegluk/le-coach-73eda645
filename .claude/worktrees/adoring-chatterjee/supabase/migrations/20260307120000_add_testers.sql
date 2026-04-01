-- Ajout des testeurs autorisés (accès gratuit, bypass Stripe)
INSERT INTO public.testers (email) VALUES
  ('anthony.bouskila@gmail.com'),
  ('alexandre.weill@weill.fr'),
  ('emmanuel.secnazi@gmail.com'),
  ('jenna.bouskila@gmail.com')
ON CONFLICT (email) DO NOTHING;

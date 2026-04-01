
-- Add dietary preferences and notification settings to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS dietary_preferences text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS allergies text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_name text DEFAULT NULL;

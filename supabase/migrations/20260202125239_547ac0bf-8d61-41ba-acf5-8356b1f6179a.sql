-- Add body fat percentage tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_body_fat_pct numeric NULL,
ADD COLUMN IF NOT EXISTS target_body_fat_pct numeric NULL;

-- Add body fat to daily metrics for tracking over time
ALTER TABLE public.daily_metrics
ADD COLUMN IF NOT EXISTS body_fat_pct numeric NULL;

COMMENT ON COLUMN public.profiles.current_body_fat_pct IS 'Starting body fat percentage at onboarding';
COMMENT ON COLUMN public.profiles.target_body_fat_pct IS 'Target body fat percentage goal';
COMMENT ON COLUMN public.daily_metrics.body_fat_pct IS 'Body fat percentage measurement for the day';
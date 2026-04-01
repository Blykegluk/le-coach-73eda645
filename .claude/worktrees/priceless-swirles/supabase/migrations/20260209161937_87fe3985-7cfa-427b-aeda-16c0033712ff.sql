-- Add activity-specific columns to workout_sessions
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS calories_burned integer;
ALTER TABLE public.workout_sessions ADD COLUMN IF NOT EXISTS distance_km numeric;

-- Migrate existing activities data into workout_sessions
INSERT INTO public.workout_sessions (user_id, workout_name, started_at, completed_at, status, total_duration_seconds, notes, calories_burned, distance_km)
SELECT user_id, activity_type, performed_at, performed_at, 'completed', duration_min * 60, notes, calories_burned, distance_km
FROM public.activities;
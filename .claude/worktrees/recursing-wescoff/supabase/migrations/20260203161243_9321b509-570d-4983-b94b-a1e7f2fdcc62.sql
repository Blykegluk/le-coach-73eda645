-- Add heart rate fields to daily_metrics for connected health devices
ALTER TABLE public.daily_metrics 
ADD COLUMN IF NOT EXISTS heart_rate_avg integer,
ADD COLUMN IF NOT EXISTS heart_rate_resting integer,
ADD COLUMN IF NOT EXISTS heart_rate_max integer,
ADD COLUMN IF NOT EXISTS active_minutes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS floors_climbed integer DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.daily_metrics.heart_rate_avg IS 'Average heart rate from connected devices (bpm)';
COMMENT ON COLUMN public.daily_metrics.heart_rate_resting IS 'Resting heart rate from connected devices (bpm)';
COMMENT ON COLUMN public.daily_metrics.heart_rate_max IS 'Maximum heart rate during the day (bpm)';
COMMENT ON COLUMN public.daily_metrics.active_minutes IS 'Active/exercise minutes from connected devices';
COMMENT ON COLUMN public.daily_metrics.floors_climbed IS 'Floors climbed from connected devices';
-- Per-set logging for detailed workout tracking
-- Stores individual set data (reps, weight, completed) instead of aggregated values

CREATE TABLE public.workout_set_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  exercise_order INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  planned_reps INTEGER,
  planned_weight_kg NUMERIC(6,1),
  actual_reps INTEGER,
  actual_weight_kg NUMERIC(6,1),
  completed BOOLEAN NOT NULL DEFAULT false,
  rpe NUMERIC(3,1), -- Rate of Perceived Exertion (1-10)
  e1rm NUMERIC(6,1), -- Estimated 1RM calculated from this set
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, exercise_name, set_number)
);

ALTER TABLE public.workout_set_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own set logs"
  ON public.workout_set_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own set logs"
  ON public.workout_set_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for exercise history queries (E1RM tracking over time)
CREATE INDEX idx_set_logs_exercise_history
  ON public.workout_set_logs (user_id, exercise_name, created_at DESC)
  WHERE completed = true;

-- Update personal_records to include e1rm record type
ALTER TABLE public.personal_records
  DROP CONSTRAINT IF EXISTS personal_records_record_type_check;

ALTER TABLE public.personal_records
  ADD CONSTRAINT personal_records_record_type_check
  CHECK (record_type IN ('max_weight', 'max_volume', 'max_e1rm'));

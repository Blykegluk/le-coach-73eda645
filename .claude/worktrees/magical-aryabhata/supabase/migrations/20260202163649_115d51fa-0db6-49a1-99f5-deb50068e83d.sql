-- Table for completed workout sessions
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_name TEXT NOT NULL,
  target_muscles TEXT[] DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for individual exercise performances within a session
CREATE TABLE public.workout_exercise_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  exercise_name TEXT NOT NULL,
  exercise_order INTEGER NOT NULL,
  planned_sets INTEGER NOT NULL,
  planned_reps TEXT NOT NULL,
  planned_weight TEXT,
  actual_sets INTEGER,
  actual_reps TEXT,
  actual_weight TEXT,
  rest_seconds INTEGER,
  duration_seconds INTEGER,
  skipped BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_exercise_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for workout_sessions
CREATE POLICY "Users can view their own workout sessions"
ON public.workout_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout sessions"
ON public.workout_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout sessions"
ON public.workout_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout sessions"
ON public.workout_sessions FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for workout_exercise_logs
CREATE POLICY "Users can view their own exercise logs"
ON public.workout_exercise_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exercise logs"
ON public.workout_exercise_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exercise logs"
ON public.workout_exercise_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own exercise logs"
ON public.workout_exercise_logs FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_workout_sessions_user_id ON public.workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_completed_at ON public.workout_sessions(completed_at);
CREATE INDEX idx_workout_exercise_logs_session_id ON public.workout_exercise_logs(session_id);
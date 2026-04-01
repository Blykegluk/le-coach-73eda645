-- =====================================================
-- Phase 7: Multi-week training programs
-- =====================================================

-- Program definition
CREATE TABLE IF NOT EXISTS training_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  goal text NOT NULL, -- lose_fat, build_muscle, maintain, recomposition, general_fitness
  difficulty text NOT NULL DEFAULT 'intermediate', -- beginner, intermediate, advanced
  duration_weeks int NOT NULL CHECK (duration_weeks BETWEEN 2 AND 12),
  sessions_per_week int NOT NULL CHECK (sessions_per_week BETWEEN 2 AND 6),
  progression_rules jsonb DEFAULT '{}', -- e.g. {"weight_increment_pct": 5, "deload_every_n_weeks": 4}
  current_week int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active', -- active, completed, paused, abandoned
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Each week of the program
CREATE TABLE IF NOT EXISTS program_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number int NOT NULL,
  focus text, -- hypertrophy, strength, endurance, deload
  notes text,
  is_deload boolean NOT NULL DEFAULT false,
  UNIQUE (program_id, week_number)
);

-- Each session within a week
CREATE TABLE IF NOT EXISTS program_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  week_id uuid NOT NULL REFERENCES program_weeks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_order int NOT NULL,
  day_of_week int, -- 1=Monday, 7=Sunday, null=flexible
  workout_data jsonb NOT NULL, -- same shape as Workout type
  completed_session_id uuid REFERENCES workout_sessions(id),
  completed_at timestamptz,
  UNIQUE (week_id, session_order)
);

-- Indexes
CREATE INDEX idx_training_programs_user_status ON training_programs(user_id, status);
CREATE INDEX idx_program_weeks_program ON program_weeks(program_id);
CREATE INDEX idx_program_sessions_program ON program_sessions(program_id);
CREATE INDEX idx_program_sessions_week ON program_sessions(week_id);

-- RLS
ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_sessions ENABLE ROW LEVEL SECURITY;

-- Policies: users can only see/modify their own data
CREATE POLICY "Users manage own programs"
  ON training_programs FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own program weeks"
  ON program_weeks FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own program sessions"
  ON program_sessions FOR ALL
  USING (auth.uid() = user_id);

-- Phase 4: Training avancé

-- Workout templates
CREATE TABLE IF NOT EXISTS workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  workout_data jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own workout templates" ON workout_templates FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_workout_templates_user ON workout_templates(user_id);

-- Personal records
CREATE TABLE IF NOT EXISTS personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_name text NOT NULL,
  record_type text NOT NULL, -- 'max_weight', 'max_volume'
  value real NOT NULL,
  achieved_at timestamptz DEFAULT now(),
  session_id uuid REFERENCES workout_sessions(id) ON DELETE SET NULL
);

ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own personal records" ON personal_records FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_personal_records_user_exercise ON personal_records(user_id, exercise_name);

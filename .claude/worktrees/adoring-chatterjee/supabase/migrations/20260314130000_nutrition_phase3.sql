-- Phase 3: Nutrition complète
-- Add macro override columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_protein integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_carbs integer;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS target_fat integer;

-- Favorite meals table
CREATE TABLE IF NOT EXISTS favorite_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  food_name text NOT NULL,
  calories integer NOT NULL DEFAULT 0,
  protein real NOT NULL DEFAULT 0,
  carbs real NOT NULL DEFAULT 0,
  fat real NOT NULL DEFAULT 0,
  meal_type text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE favorite_meals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own favorite meals"
  ON favorite_meals FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_favorite_meals_user ON favorite_meals(user_id);

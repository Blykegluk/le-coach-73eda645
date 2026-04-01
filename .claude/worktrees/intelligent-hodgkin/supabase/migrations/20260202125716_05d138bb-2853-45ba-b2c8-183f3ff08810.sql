-- Create body composition table to store impedance meter measurements
CREATE TABLE public.body_composition (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  measured_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Core metrics
  weight_kg numeric,
  body_fat_pct numeric,
  muscle_mass_kg numeric,
  lean_mass_kg numeric,
  bone_mass_kg numeric,
  water_pct numeric,
  
  -- Calculated/derived metrics
  bmi numeric,
  bmr_kcal integer,
  visceral_fat_index integer,
  body_age integer,
  
  -- Detailed breakdown
  protein_pct numeric,
  protein_kg numeric,
  subcutaneous_fat_pct numeric,
  fat_mass_kg numeric,
  skeletal_muscle_pct numeric,
  
  -- Standard/ideal weight from scale
  standard_weight_kg numeric,
  
  -- Raw JSON for any extra data or photo analysis
  raw_data jsonb,
  photo_url text,
  
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.body_composition ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own body composition" 
ON public.body_composition FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own body composition" 
ON public.body_composition FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own body composition" 
ON public.body_composition FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own body composition" 
ON public.body_composition FOR DELETE 
USING (auth.uid() = user_id);

-- Add target fields to profiles for body composition goals
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS target_muscle_mass_kg numeric NULL,
ADD COLUMN IF NOT EXISTS target_lean_mass_kg numeric NULL,
ADD COLUMN IF NOT EXISTS target_visceral_fat_index integer NULL;

-- Create index for efficient queries
CREATE INDEX idx_body_composition_user_date ON public.body_composition(user_id, measured_at DESC);
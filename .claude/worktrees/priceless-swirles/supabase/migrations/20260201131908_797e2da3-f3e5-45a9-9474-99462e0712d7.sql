-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  gender TEXT,
  birth_date DATE,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  activity_level TEXT,
  goal TEXT,
  target_weight_kg NUMERIC,
  weekly_goal_kg NUMERIC,
  target_steps INTEGER DEFAULT 10000,
  target_water_ml INTEGER DEFAULT 2000,
  target_sleep_hours NUMERIC DEFAULT 8,
  target_calories INTEGER DEFAULT 2000,
  onboarding_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily_metrics table
CREATE TABLE public.daily_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  steps INTEGER,
  sleep_hours NUMERIC,
  weight NUMERIC,
  water_ml INTEGER DEFAULT 0,
  calories_in INTEGER DEFAULT 0,
  calories_burned INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create nutrition_logs table
CREATE TABLE public.nutrition_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL,
  food_name TEXT NOT NULL,
  calories INTEGER DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  photo_url TEXT,
  ai_analysis_json JSONB,
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activities table
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  duration_min INTEGER NOT NULL,
  calories_burned INTEGER DEFAULT 0,
  distance_km NUMERIC,
  notes TEXT,
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Daily metrics policies
CREATE POLICY "Users can view their own daily_metrics"
ON public.daily_metrics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily_metrics"
ON public.daily_metrics FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily_metrics"
ON public.daily_metrics FOR UPDATE
USING (auth.uid() = user_id);

-- Nutrition logs policies
CREATE POLICY "Users can view their own nutrition_logs"
ON public.nutrition_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own nutrition_logs"
ON public.nutrition_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own nutrition_logs"
ON public.nutrition_logs FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own nutrition_logs"
ON public.nutrition_logs FOR DELETE
USING (auth.uid() = user_id);

-- Activities policies
CREATE POLICY "Users can view their own activities"
ON public.activities FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activities"
ON public.activities FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities"
ON public.activities FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities"
ON public.activities FOR DELETE
USING (auth.uid() = user_id);

-- Create function for updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_metrics_updated_at
BEFORE UPDATE ON public.daily_metrics
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
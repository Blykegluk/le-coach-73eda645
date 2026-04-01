-- Add avg_heart_rate column to activities
ALTER TABLE public.activities ADD COLUMN avg_heart_rate INTEGER;

-- Create user_context table
CREATE TABLE public.user_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

-- Enable RLS
ALTER TABLE public.user_context ENABLE ROW LEVEL SECURITY;

-- Create policies for user_context
CREATE POLICY "Users can view their own context"
ON public.user_context FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own context"
ON public.user_context FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own context"
ON public.user_context FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own context"
ON public.user_context FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_user_context_updated_at
BEFORE UPDATE ON public.user_context
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Fix the function search_path security issue
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
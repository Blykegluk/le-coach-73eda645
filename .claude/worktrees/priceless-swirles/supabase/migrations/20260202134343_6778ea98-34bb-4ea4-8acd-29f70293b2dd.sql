-- Block public/anonymous access to user_context table
-- Drop existing policies and recreate with proper authenticated-only access

DROP POLICY IF EXISTS "Users can view their own context" ON public.user_context;
DROP POLICY IF EXISTS "Users can insert their own context" ON public.user_context;
DROP POLICY IF EXISTS "Users can update their own context" ON public.user_context;
DROP POLICY IF EXISTS "Users can delete their own context" ON public.user_context;

-- Recreate policies with explicit 'TO authenticated' to block anonymous access
CREATE POLICY "Users can view their own context" 
ON public.user_context 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own context" 
ON public.user_context 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own context" 
ON public.user_context 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own context" 
ON public.user_context 
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Same fix for profiles table (also flagged)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);
-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all modules" ON public.user_modules;
DROP POLICY IF EXISTS "Users can view own modules" ON public.user_modules;

-- Create more permissive policies for user_modules

-- Admins can do everything
CREATE POLICY "Admins can manage all user_modules" 
ON public.user_modules 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own modules (by user_id or email)
CREATE POLICY "Users can view own modules" 
ON public.user_modules 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Users can update their own modules (to sync user_id)
CREATE POLICY "Users can update own modules by email" 
ON public.user_modules 
FOR UPDATE 
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
)
WITH CHECK (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
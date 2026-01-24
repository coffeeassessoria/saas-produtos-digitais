-- Drop existing restrictive policies on user_modules
DROP POLICY IF EXISTS "Admins can manage all user_modules" ON public.user_modules;
DROP POLICY IF EXISTS "Users can view own modules" ON public.user_modules;
DROP POLICY IF EXISTS "Users can update own modules by email" ON public.user_modules;

-- Recreate as PERMISSIVE policies (default, OR logic)
CREATE POLICY "Admins can manage all user_modules" 
ON public.user_modules 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own modules" 
ON public.user_modules 
FOR SELECT 
TO authenticated
USING (
  (auth.uid() = user_id) 
  OR (email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
);

CREATE POLICY "Users can update own modules by email" 
ON public.user_modules 
FOR UPDATE 
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid())::text)
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid())::text);
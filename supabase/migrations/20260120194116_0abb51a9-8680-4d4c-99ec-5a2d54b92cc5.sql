-- Fix admin panel visibility by removing auth.users dependencies inside RLS policies
-- (those subqueries can fail for authenticated clients and make queries return 0 or error)

-- Recreate user_modules policies using JWT email claim
DO $$
BEGIN
  -- Drop old policies (if present)
  EXECUTE 'DROP POLICY IF EXISTS "Users can view own modules" ON public.user_modules';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own modules by email" ON public.user_modules';
END $$;

-- Users can view own modules (by user_id OR email from JWT)
CREATE POLICY "Users can view own modules"
ON public.user_modules
AS PERMISSIVE
FOR SELECT
USING (
  auth.uid() = user_id
  OR email = (auth.jwt() ->> 'email')
);

-- Users can sync/link their own rows by email; ensure user_id can only be set to themselves
CREATE POLICY "Users can update own modules by email"
ON public.user_modules
AS PERMISSIVE
FOR UPDATE
USING (
  email = (auth.jwt() ->> 'email')
)
WITH CHECK (
  email = (auth.jwt() ->> 'email')
  AND user_id = auth.uid()
);

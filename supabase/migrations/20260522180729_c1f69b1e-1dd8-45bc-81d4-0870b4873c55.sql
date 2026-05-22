DROP POLICY IF EXISTS "Allow anonymous users to view gyms" ON public.gyms;
DROP POLICY IF EXISTS "Chiunque può vedere le palestre attive" ON public.gyms;

CREATE POLICY "Allow anonymous users to view active gyms"
ON public.gyms
FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "Authenticated users can view active gyms"
ON public.gyms
FOR SELECT
TO authenticated
USING (is_active = true);
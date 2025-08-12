-- Ensure public gyms are visible to everyone for selection during registration
DROP POLICY IF EXISTS "Chiunque può vedere le palestre attive" ON public.gyms;
CREATE POLICY "Chiunque può vedere le palestre attive"
ON public.gyms
FOR SELECT
TO authenticated, anon
USING (is_active = true);

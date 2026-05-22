DROP POLICY IF EXISTS "Admins can manage all gyms" ON public.gyms;

CREATE POLICY "Admins can manage all gyms"
ON public.gyms
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
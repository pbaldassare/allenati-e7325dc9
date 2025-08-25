-- Prima controlla e rimuovi tutte le policy di INSERT esistenti per chat_messages
DROP POLICY IF EXISTS "Staff can insert messages in accessible rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Staff can insert messages in their rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in accessible rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can insert messages in their rooms" ON public.chat_messages;

-- Crea nuove policy che permettono INSERT solo a instructor, gym_owner o admin
CREATE POLICY "Staff can insert messages in accessible rooms" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (has_role(auth.uid(), 'instructor'::app_role) OR has_role(auth.uid(), 'gym_owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND room_id IN (
    SELECT cr.id
    FROM chat_rooms cr
    JOIN user_gym_memberships ugm ON cr.gym_id = ugm.gym_id
    WHERE ugm.user_id = auth.uid() 
      AND ugm.status = 'active' 
      AND cr.is_active = true
  )
);

CREATE POLICY "Staff can insert messages in their rooms" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (has_role(auth.uid(), 'instructor'::app_role) OR has_role(auth.uid(), 'gym_owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  AND EXISTS (
    SELECT 1
    FROM chat_participants
    WHERE room_id = chat_messages.room_id 
      AND user_id = auth.uid() 
      AND is_active = true
  )
);
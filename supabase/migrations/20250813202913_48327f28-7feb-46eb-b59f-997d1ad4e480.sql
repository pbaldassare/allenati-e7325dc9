-- Fix RLS policies for chat system to avoid infinite recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view participants in their rooms" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.chat_rooms;

-- Create simplified, non-recursive policies for chat_participants
CREATE POLICY "Users can view all active participants" 
ON public.chat_participants 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Users can insert themselves as participants" 
ON public.chat_participants 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation" 
ON public.chat_participants 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create simplified policies for chat_rooms
CREATE POLICY "Users can view chat rooms for their gyms" 
ON public.chat_rooms 
FOR SELECT 
USING (
  is_active = true AND (
    gym_id IN (
      SELECT gym_id 
      FROM public.user_gym_memberships 
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR 
    course_id IN (
      SELECT c.id 
      FROM public.courses c
      JOIN public.user_gym_memberships ugm ON c.gym_id = ugm.gym_id
      WHERE ugm.user_id = auth.uid() AND ugm.status = 'active'
    )
  )
);

-- Create policies for chat_messages
CREATE POLICY "Users can view messages in accessible rooms" 
ON public.chat_messages 
FOR SELECT 
USING (
  room_id IN (
    SELECT cr.id 
    FROM public.chat_rooms cr
    JOIN public.user_gym_memberships ugm ON cr.gym_id = ugm.gym_id
    WHERE ugm.user_id = auth.uid() AND ugm.status = 'active' AND cr.is_active = true
  )
);

CREATE POLICY "Users can insert messages in accessible rooms" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  room_id IN (
    SELECT cr.id 
    FROM public.chat_rooms cr
    JOIN public.user_gym_memberships ugm ON cr.gym_id = ugm.gym_id
    WHERE ugm.user_id = auth.uid() AND ugm.status = 'active' AND cr.is_active = true
  )
);

-- Function to auto-join users to gym chat when they join a gym
CREATE OR REPLACE FUNCTION public.auto_join_gym_chat()
RETURNS TRIGGER AS $$
DECLARE
  _general_chat_id uuid;
BEGIN
  -- Only process active memberships
  IF NEW.status = 'active' THEN
    -- Find or create general chat for the gym
    SELECT id INTO _general_chat_id
    FROM public.chat_rooms
    WHERE gym_id = NEW.gym_id 
      AND room_type = 'gym_general'
      AND is_active = true;
    
    -- If no general chat exists, create one
    IF _general_chat_id IS NULL THEN
      INSERT INTO public.chat_rooms (name, description, room_type, gym_id, created_by)
      VALUES (
        'Chat Generale', 
        'Chat generale della palestra', 
        'gym_general', 
        NEW.gym_id, 
        NEW.user_id
      ) RETURNING id INTO _general_chat_id;
    END IF;
    
    -- Add user to the chat as a member
    INSERT INTO public.chat_participants (room_id, user_id, role)
    VALUES (_general_chat_id, NEW.user_id, 'member')
    ON CONFLICT (room_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-joining gym chats
DROP TRIGGER IF EXISTS auto_join_gym_chat_trigger ON public.user_gym_memberships;
CREATE TRIGGER auto_join_gym_chat_trigger
  AFTER INSERT OR UPDATE ON public.user_gym_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_join_gym_chat();

-- Add unique constraint to prevent duplicate participants
ALTER TABLE public.chat_participants 
ADD CONSTRAINT unique_room_user_participant 
UNIQUE (room_id, user_id);

-- Create default gym general chats for existing gyms without one
INSERT INTO public.chat_rooms (name, description, room_type, gym_id, created_by)
SELECT 
  'Chat Generale',
  'Chat generale della palestra',
  'gym_general',
  g.id,
  COALESCE((
    SELECT ugm.user_id 
    FROM public.user_gym_memberships ugm 
    WHERE ugm.gym_id = g.id 
      AND ugm.membership_type = 'owner' 
      AND ugm.status = 'active'
    LIMIT 1
  ), (
    SELECT ugm.user_id 
    FROM public.user_gym_memberships ugm 
    WHERE ugm.gym_id = g.id 
      AND ugm.status = 'active'
    LIMIT 1
  ))
FROM public.gyms g
WHERE g.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.chat_rooms cr 
    WHERE cr.gym_id = g.id 
      AND cr.room_type = 'gym_general' 
      AND cr.is_active = true
  );

-- Auto-join existing gym members to their gym general chats
INSERT INTO public.chat_participants (room_id, user_id, role)
SELECT DISTINCT
  cr.id,
  ugm.user_id,
  CASE 
    WHEN ugm.membership_type = 'owner' THEN 'admin'
    ELSE 'member'
  END
FROM public.user_gym_memberships ugm
JOIN public.chat_rooms cr ON cr.gym_id = ugm.gym_id
WHERE ugm.status = 'active'
  AND cr.room_type = 'gym_general'
  AND cr.is_active = true
ON CONFLICT (room_id, user_id) DO NOTHING;
-- Create chat rooms table
CREATE TABLE public.chat_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  room_type TEXT NOT NULL CHECK (room_type IN ('gym_general', 'course', 'direct')),
  gym_id UUID,
  course_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  metadata JSONB,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create chat participants table
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_read_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_rooms
CREATE POLICY "Users can view rooms they participate in" 
ON public.chat_rooms 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE room_id = chat_rooms.id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Admins can manage all rooms" 
ON public.chat_rooms 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for chat_messages
CREATE POLICY "Users can view messages in their rooms" 
ON public.chat_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE room_id = chat_messages.room_id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Users can insert messages in their rooms" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.chat_participants 
    WHERE room_id = chat_messages.room_id 
    AND user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Users can update their own messages" 
ON public.chat_messages 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for chat_participants
CREATE POLICY "Users can view participants in their rooms" 
ON public.chat_participants 
FOR SELECT 
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.chat_participants cp 
    WHERE cp.room_id = chat_participants.room_id 
    AND cp.user_id = auth.uid() 
    AND cp.is_active = true
  )
);

CREATE POLICY "Admins can manage all participants" 
ON public.chat_participants 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at triggers
CREATE TRIGGER update_chat_rooms_updated_at
BEFORE UPDATE ON public.chat_rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.chat_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_participants REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;

-- Function to create gym general chat
CREATE OR REPLACE FUNCTION public.create_gym_general_chat(
  _gym_id UUID,
  _created_by UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _room_id UUID;
BEGIN
  -- Check if gym general chat already exists
  SELECT id INTO _room_id
  FROM public.chat_rooms
  WHERE gym_id = _gym_id 
    AND room_type = 'gym_general'
    AND is_active = true;
    
  IF _room_id IS NOT NULL THEN
    RETURN _room_id;
  END IF;
  
  -- Create new gym general chat
  INSERT INTO public.chat_rooms (
    name, 
    description, 
    room_type, 
    gym_id, 
    created_by
  ) VALUES (
    'Chat Generale', 
    'Chat generale della palestra', 
    'gym_general', 
    _gym_id, 
    _created_by
  ) RETURNING id INTO _room_id;
  
  -- Add creator as admin participant
  INSERT INTO public.chat_participants (room_id, user_id, role)
  VALUES (_room_id, _created_by, 'admin');
  
  RETURN _room_id;
END;
$$;

-- Function to create course chat
CREATE OR REPLACE FUNCTION public.create_course_chat(
  _course_id UUID,
  _course_name TEXT,
  _created_by UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _room_id UUID;
BEGIN
  -- Check if course chat already exists
  SELECT id INTO _room_id
  FROM public.chat_rooms
  WHERE course_id = _course_id 
    AND room_type = 'course'
    AND is_active = true;
    
  IF _room_id IS NOT NULL THEN
    RETURN _room_id;
  END IF;
  
  -- Create new course chat
  INSERT INTO public.chat_rooms (
    name, 
    description, 
    room_type, 
    course_id, 
    created_by
  ) VALUES (
    'Chat ' || _course_name, 
    'Chat del corso ' || _course_name, 
    'course', 
    _course_id, 
    _created_by
  ) RETURNING id INTO _room_id;
  
  -- Add creator as admin participant
  INSERT INTO public.chat_participants (room_id, user_id, role)
  VALUES (_room_id, _created_by, 'admin');
  
  RETURN _room_id;
END;
$$;
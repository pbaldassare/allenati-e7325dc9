-- Enable real-time for all critical tables
-- Step 1: Set REPLICA IDENTITY FULL for all tables
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.user_subscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.credits_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.courses REPLICA IDENTITY FULL;
ALTER TABLE public.course_schedules REPLICA IDENTITY FULL;
ALTER TABLE public.instructors REPLICA IDENTITY FULL;
ALTER TABLE public.gym_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.user_gym_memberships REPLICA IDENTITY FULL;
ALTER TABLE public.medical_certificates REPLICA IDENTITY FULL;
ALTER TABLE public.gym_applications REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
ALTER TABLE public.course_categories REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER TABLE public.mobile_notifications REPLICA IDENTITY FULL;

-- Step 2: Add all tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.credits_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.courses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.instructors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gym_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_gym_memberships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.medical_certificates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gym_applications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.course_categories;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mobile_notifications;

-- Step 3: Update auto_join_gym_chat function to send welcome message with user's name
CREATE OR REPLACE FUNCTION public.auto_join_gym_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  _general_chat_id uuid;
  _user_name text;
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
    
    -- Get user's first name for welcome message
    SELECT COALESCE(first_name, 'Nuovo utente') INTO _user_name
    FROM public.profiles
    WHERE user_id = NEW.user_id;
    
    -- Send personalized welcome message
    INSERT INTO public.chat_messages (room_id, user_id, content, message_type)
    VALUES (
      _general_chat_id,
      NULL, -- NULL user_id indicates system message
      'Benvenuto/a ' || _user_name || ' nella chat generale della palestra! 👋',
      'system'
    );
  END IF;
  
  RETURN NEW;
END;
$function$;
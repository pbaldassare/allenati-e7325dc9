-- Final cleanup: Ensure all users with active memberships have gym_credits records
-- Specifically fix users like Antonella who might be missing records

DO $$
DECLARE
    user_record RECORD;
    membership_record RECORD;
BEGIN
    -- Log start
    RAISE LOG 'Starting final gym_credits cleanup for users with active memberships';
    
    -- Create gym_credits records for all users with active memberships who don't have them
    FOR membership_record IN 
        SELECT DISTINCT ugm.user_id, ugm.gym_id, p.first_name, p.last_name
        FROM public.user_gym_memberships ugm
        JOIN public.profiles p ON ugm.user_id = p.user_id
        WHERE ugm.status = 'active'
        AND NOT EXISTS (
            SELECT 1 FROM public.gym_credits gc 
            WHERE gc.user_id = ugm.user_id 
            AND gc.gym_id = ugm.gym_id
        )
    LOOP
        -- Insert missing gym_credits record with 0 credits
        INSERT INTO public.gym_credits (user_id, gym_id, credits)
        VALUES (membership_record.user_id, membership_record.gym_id, 0)
        ON CONFLICT (user_id, gym_id) DO NOTHING;
        
        RAISE LOG 'Created gym_credits record for user: % % (gym: %)', 
            membership_record.first_name, membership_record.last_name, membership_record.gym_id;
    END LOOP;
    
    -- Specifically check and fix Antonella's case
    -- Find user with email f.f.combatlab@gmail.com
    SELECT user_id INTO user_record
    FROM public.profiles 
    WHERE email = 'f.f.combatlab@gmail.com'
    LIMIT 1;
    
    IF FOUND THEN
        RAISE LOG 'Found Antonella (user_id: %), checking her memberships...', user_record;
        
        -- Check her memberships and ensure gym_credits exist
        FOR membership_record IN 
            SELECT ugm.gym_id, g.name as gym_name
            FROM public.user_gym_memberships ugm
            JOIN public.gyms g ON ugm.gym_id = g.id
            WHERE ugm.user_id = user_record
            AND ugm.status = 'active'
        LOOP
            -- Ensure gym_credits record exists
            INSERT INTO public.gym_credits (user_id, gym_id, credits)
            VALUES (user_record, membership_record.gym_id, 0)
            ON CONFLICT (user_id, gym_id) 
            DO UPDATE SET updated_at = now();
            
            RAISE LOG 'Ensured gym_credits record for Antonella in gym: %', membership_record.gym_name;
        END LOOP;
    ELSE
        RAISE LOG 'Antonella not found with email f.f.combatlab@gmail.com';
    END IF;
    
    -- Final validation
    RAISE LOG 'Final cleanup completed. All users with active memberships should now have gym_credits records.';
END $$;
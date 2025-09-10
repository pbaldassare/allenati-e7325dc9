-- Get Combat Lab gym ID
DO $$
DECLARE
    combat_lab_gym_id uuid;
    arti_marziali_main_id uuid;
    fitness_main_id uuid;
BEGIN
    -- Get Combat Lab gym ID
    SELECT id INTO combat_lab_gym_id 
    FROM public.gyms 
    WHERE name = 'Combat Lab' 
    LIMIT 1;
    
    -- Get main category IDs
    SELECT id INTO arti_marziali_main_id 
    FROM public.main_categories 
    WHERE name = 'Arti Marziali' AND requires_belt = true 
    LIMIT 1;
    
    SELECT id INTO fitness_main_id 
    FROM public.main_categories 
    WHERE name = 'Fitness' 
    LIMIT 1;
    
    -- Only proceed if Combat Lab exists
    IF combat_lab_gym_id IS NOT NULL THEN
        -- Create Arti Marziali category for Combat Lab (requires belt)
        IF arti_marziali_main_id IS NOT NULL THEN
            INSERT INTO public.course_categories (
                gym_id,
                main_category_id,
                name,
                description,
                color_hex,
                icon_name,
                is_active
            ) VALUES (
                combat_lab_gym_id,
                arti_marziali_main_id,
                'Arti Marziali',
                'Discipline di combattimento e arti marziali',
                '#DC2626',
                'Sword',
                true
            ) ON CONFLICT DO NOTHING;
        END IF;
        
        -- Create additional categories for Combat Lab
        IF fitness_main_id IS NOT NULL THEN
            INSERT INTO public.course_categories (
                gym_id,
                main_category_id,
                name,
                description,
                color_hex,
                icon_name,
                is_active
            ) VALUES (
                combat_lab_gym_id,
                fitness_main_id,
                'Functional Training',
                'Allenamento funzionale e preparazione fisica',
                '#059669',
                'Dumbbell',
                true
            ) ON CONFLICT DO NOTHING;
        END IF;
        
        -- Create Boxe category
        INSERT INTO public.course_categories (
            gym_id,
            main_category_id,
            name,
            description,
            color_hex,
            icon_name,
            is_active
        ) VALUES (
            combat_lab_gym_id,
            arti_marziali_main_id,
            'Boxe',
            'Pugilato e tecniche di striking',
            '#7C2D12',
            'Target',
            true
        ) ON CONFLICT DO NOTHING;
        
        -- Create MMA category
        INSERT INTO public.course_categories (
            gym_id,
            main_category_id,
            name,
            description,
            color_hex,
            icon_name,
            is_active
        ) VALUES (
            combat_lab_gym_id,
            arti_marziali_main_id,
            'MMA',
            'Mixed Martial Arts - Arti marziali miste',
            '#991B1B',
            'Shield',
            true
        ) ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Course categories created for Combat Lab gym';
    ELSE
        RAISE NOTICE 'Combat Lab gym not found';
    END IF;
END $$;
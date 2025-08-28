-- Step 1: Create the new martial arts categories with appropriate colors
INSERT INTO public.course_categories (name, description, color_hex, icon_name, is_active) VALUES
('Muay Thai', 'Arte marziale tailandese che utilizza pugni, calci, ginocchiate e gomitate', '#DC2626', 'fist', true),
('Kick Boxing', 'Sport da combattimento che combina tecniche di pugilato e calci', '#EA580C', 'target', true),
('Brazilian Jiu Jitsu', 'Arte marziale brasiliana che si concentra sulla lotta a terra e sottomissioni', '#7C3AED', 'shield', true),
('Grappling', 'Disciplina di lotta che include proiezioni, controlli e sottomissioni', '#059669', 'zap', true),
('MMA', 'Arti marziali miste che combinano diverse discipline di combattimento', '#B91C1C', 'flame', true),
('Martial Arts Kids', 'Programmi di arti marziali dedicati ai bambini e ragazzi', '#F59E0B', 'star', true),
('Preparazione Atletica', 'Allenamento specifico per migliorare le prestazioni atletiche', '#3B82F6', 'trending-up', true),
('Conditioning', 'Allenamento per migliorare la forma fisica generale e la resistenza', '#10B981', 'activity', true);

-- Step 2: Get the ID of the first new category (Muay Thai) to reassign existing courses
DO $$
DECLARE
    muay_thai_id uuid;
BEGIN
    -- Get the Muay Thai category ID
    SELECT id INTO muay_thai_id 
    FROM public.course_categories 
    WHERE name = 'Muay Thai' 
    LIMIT 1;
    
    -- Step 3: Move all existing active courses to Muay Thai category
    UPDATE public.courses 
    SET category_id = muay_thai_id,
        updated_at = now()
    WHERE is_active = true 
    AND category_id != muay_thai_id;
    
    -- Log the number of courses moved
    RAISE NOTICE 'Moved % courses to Muay Thai category', 
        (SELECT COUNT(*) FROM public.courses WHERE category_id = muay_thai_id);
END $$;

-- Step 4: Deactivate all old categories (keep only the new martial arts ones)
UPDATE public.course_categories 
SET is_active = false,
    updated_at = now()
WHERE name NOT IN (
    'Muay Thai', 
    'Kick Boxing', 
    'Brazilian Jiu Jitsu', 
    'Grappling', 
    'MMA', 
    'Martial Arts Kids', 
    'Preparazione Atletica', 
    'Conditioning'
);

-- Step 5: Verify the changes
SELECT 
    name,
    description,
    color_hex,
    is_active,
    (SELECT COUNT(*) FROM courses WHERE category_id = course_categories.id AND is_active = true) as active_courses_count
FROM public.course_categories 
WHERE is_active = true
ORDER BY name;
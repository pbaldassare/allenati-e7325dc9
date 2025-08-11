-- Update course category icons to match valid Lucide React components
-- and change BJJ to Brazilian Jiu-Jitsu

-- Update BJJ category name and ensure it has correct icon
UPDATE course_categories 
SET name = 'Brazilian Jiu-Jitsu'
WHERE name = 'BJJ' AND is_active = true;

-- Update Boxing icon from 'hand' to 'target' (hand doesn't exist in Lucide)
UPDATE course_categories 
SET icon_name = 'target'
WHERE name = 'Boxing' AND is_active = true;

-- Update other icons to ensure they match valid Lucide React components
UPDATE course_categories 
SET icon_name = 'flame'
WHERE name = 'Kickboxing' AND is_active = true;

-- Add Kickboxing to match Wrestling and other combat sports
UPDATE course_categories 
SET icon_name = 'swords'
WHERE name = 'MMA' AND is_active = true;
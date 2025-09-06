-- Create main categories table
CREATE TABLE public.main_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  requires_belt BOOLEAN NOT NULL DEFAULT false,
  color_hex TEXT,
  icon_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on main_categories
ALTER TABLE public.main_categories ENABLE ROW LEVEL SECURITY;

-- Add main_category_id to course_categories
ALTER TABLE public.course_categories 
ADD COLUMN main_category_id UUID REFERENCES public.main_categories(id);

-- Insert main categories
INSERT INTO public.main_categories (name, description, requires_belt, color_hex, icon_name) VALUES
('Arti Marziali', 'Discipline di combattimento e autodifesa', true, '#EF4444', 'shield'),
('Fitness', 'Allenamento fisico e condizionamento', false, '#10B981', 'dumbbell'),
('Danza', 'Espressione artistica attraverso il movimento', false, '#8B5CF6', 'music'),
('Benessere', 'Pratiche per il benessere psicofisico', false, '#06B6D4', 'heart');

-- Update existing course_categories to link to main categories
-- Brazilian Jiu Jitsu, Boxe → Arti Marziali
UPDATE public.course_categories 
SET main_category_id = (SELECT id FROM public.main_categories WHERE name = 'Arti Marziali')
WHERE name IN ('Brazilian Jiu Jitsu', 'Boxe', 'BJJ', 'Karate', 'Taekwondo', 'Muay Thai', 'Judo', 'MMA');

-- Pilates, Cardio, HIIT, Functional Training → Fitness
UPDATE public.course_categories 
SET main_category_id = (SELECT id FROM public.main_categories WHERE name = 'Fitness')
WHERE name IN ('Pilates', 'Cardio', 'HIIT', 'Functional Training', 'CrossFit', 'Bodybuilding', 'Calisthenics', 'Conditioning');

-- Danza → Danza
UPDATE public.course_categories 
SET main_category_id = (SELECT id FROM public.main_categories WHERE name = 'Danza')
WHERE name IN ('Danza', 'Zumba', 'Hip Hop', 'Salsa', 'Bachata');

-- Yoga → Benessere
UPDATE public.course_categories 
SET main_category_id = (SELECT id FROM public.main_categories WHERE name = 'Benessere')
WHERE name IN ('Yoga', 'Meditazione', 'Stretching', 'Rilassamento');

-- Create RLS policies for main_categories
CREATE POLICY "Users can view active main categories" 
ON public.main_categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage all main categories" 
ON public.main_categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gym owners can manage main categories" 
ON public.main_categories 
FOR ALL 
USING (has_role(auth.uid(), 'gym_owner'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_main_categories_updated_at
BEFORE UPDATE ON public.main_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user practices martial arts
CREATE OR REPLACE FUNCTION public.user_practices_martial_arts(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.bookings b
    JOIN public.courses c ON b.course_id = c.id
    JOIN public.course_categories cc ON c.category_id = cc.id
    JOIN public.main_categories mc ON cc.main_category_id = mc.id
    WHERE b.user_id = _user_id 
      AND mc.requires_belt = true
      AND b.status = 'confirmed'
  )
$$;
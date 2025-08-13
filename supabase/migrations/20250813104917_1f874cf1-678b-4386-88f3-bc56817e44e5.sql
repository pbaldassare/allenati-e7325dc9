-- Add color field to gym_rooms table
ALTER TABLE public.gym_rooms 
ADD COLUMN color text DEFAULT '#6B7280';

-- Add index for color filtering if needed
CREATE INDEX IF NOT EXISTS idx_gym_rooms_color ON public.gym_rooms(color);
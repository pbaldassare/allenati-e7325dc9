-- Add reserved_spots column to courses table
ALTER TABLE public.courses 
ADD COLUMN reserved_spots integer NOT NULL DEFAULT 0;

-- Add constraint to ensure reserved_spots doesn't exceed max_participants
ALTER TABLE public.courses 
ADD CONSTRAINT courses_reserved_spots_check 
CHECK (reserved_spots >= 0 AND reserved_spots <= max_participants);

-- Add comment for documentation
COMMENT ON COLUMN public.courses.reserved_spots IS 'Number of spots reserved for subscribers/credit holders only. Remaining spots (max_participants - reserved_spots) are available for direct purchase.';
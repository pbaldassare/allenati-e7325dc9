-- Add belt field to user profiles
-- Create enum for belt levels
CREATE TYPE public.belt_level AS ENUM ('Bianca', 'Blu', 'Viola', 'Marrone', 'Nera');

-- Add belt column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN belt belt_level;
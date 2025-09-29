-- Create receipt counters table for progressive numbering
CREATE TABLE public.receipt_counters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(gym_id, year)
);

-- Enable RLS
ALTER TABLE public.receipt_counters ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage receipt counters" 
ON public.receipt_counters 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Gym owners can view their receipt counters" 
ON public.receipt_counters 
FOR SELECT
USING (has_role(auth.uid(), 'gym_owner'::app_role) AND gym_id = ANY(get_user_owned_gyms(auth.uid())));

-- Add receipt_number column to user_subscriptions
ALTER TABLE public.user_subscriptions 
ADD COLUMN receipt_number TEXT;

-- Create function to get next receipt number atomically
CREATE OR REPLACE FUNCTION public.get_next_receipt_number(_gym_id uuid, _year integer DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _current_year integer;
  _next_counter integer;
  _receipt_number text;
BEGIN
  -- Use current year if not provided
  _current_year := COALESCE(_year, EXTRACT(YEAR FROM now())::integer);
  
  -- Insert or update counter atomically
  INSERT INTO public.receipt_counters (gym_id, year, counter)
  VALUES (_gym_id, _current_year, 1)
  ON CONFLICT (gym_id, year) 
  DO UPDATE SET 
    counter = receipt_counters.counter + 1,
    updated_at = now()
  RETURNING counter INTO _next_counter;
  
  -- Format receipt number as XXX-YYYY
  _receipt_number := LPAD(_next_counter::text, 3, '0') || '-' || _current_year::text;
  
  RETURN _receipt_number;
END;
$$;

-- Add trigger for updated_at
CREATE TRIGGER update_receipt_counters_updated_at
BEFORE UPDATE ON public.receipt_counters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
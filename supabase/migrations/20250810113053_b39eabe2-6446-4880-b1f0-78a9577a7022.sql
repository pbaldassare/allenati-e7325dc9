-- Link existing users to Fight Club Milano gym
-- First, get the gym ID for Fight Club Milano (assuming it's the only gym)
INSERT INTO public.user_gym_memberships (user_id, gym_id, status, membership_type, joined_at, expires_at)
SELECT 
  p.user_id,
  g.id as gym_id,
  'active' as status,
  'member' as membership_type,
  now() as joined_at,
  now() + interval '1 year' as expires_at
FROM public.profiles p
CROSS JOIN public.gyms g
WHERE g.name = 'Fight Club Milano'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_gym_memberships ugm 
    WHERE ugm.user_id = p.user_id AND ugm.gym_id = g.id
  );
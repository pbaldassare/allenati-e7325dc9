UPDATE public.user_gym_memberships
SET status = 'active',
    updated_at = now()
WHERE user_id = '703553cb-dd5e-4e07-982c-995480be3377'
  AND gym_id = '24140ca1-d9b9-4987-a5b8-6077fa20015b';
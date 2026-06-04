INSERT INTO public.user_gym_memberships (user_id, gym_id, membership_type, status)
VALUES ('703553cb-dd5e-4e07-982c-995480be3377', '24140ca1-d9b9-4987-a5b8-6077fa20015b', 'member', 'active')
ON CONFLICT DO NOTHING;
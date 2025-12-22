-- Associate Claudia Orfano with Combat Lab gym
INSERT INTO user_gym_memberships (user_id, gym_id, membership_type, status, joined_at)
VALUES (
  '7b73b693-3e5f-4bcd-9d28-e47c95b32bff',  -- Claudia Orfano (correct user_id)
  '8abc8f4d-4260-4850-a0d0-b1ada1265701',  -- Combat Lab
  'member',
  'active',
  now()
)
ON CONFLICT (user_id, gym_id) DO UPDATE SET status = 'active', updated_at = now();
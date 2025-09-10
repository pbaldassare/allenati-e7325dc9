-- Temporarily give the current user owner access to the demo gym for testing
INSERT INTO user_roles (user_id, role, is_active)
VALUES ('7fd33b87-5c1e-4b93-87b7-5e8977b7b698', 'gym_owner', true)
ON CONFLICT (user_id, role) DO UPDATE SET is_active = true;

INSERT INTO user_gym_memberships (user_id, gym_id, membership_type, status)
VALUES ('7fd33b87-5c1e-4b93-87b7-5e8977b7b698', '8e44d37a-bf6b-4ad7-aa33-7132f41bb6ba', 'owner', 'active')
ON CONFLICT (user_id, gym_id) DO UPDATE SET membership_type = 'owner', status = 'active';
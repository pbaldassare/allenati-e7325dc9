UPDATE auth.users
SET encrypted_password = crypt('Charme2026!', gen_salt('bf')),
    updated_at = now()
WHERE id = '703553cb-dd5e-4e07-982c-995480be3377';
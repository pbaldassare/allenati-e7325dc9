UPDATE auth.users 
SET encrypted_password = crypt('Allenati123!', gen_salt('bf')) 
WHERE email = 'demopalestra@gmail.com';
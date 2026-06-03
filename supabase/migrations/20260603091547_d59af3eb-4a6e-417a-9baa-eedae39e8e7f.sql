UPDATE public.profiles
SET email = 'danila.d@hotmail.it',
    updated_at = now()
WHERE user_id = '703553cb-dd5e-4e07-982c-995480be3377'
  AND lower(email) = 'danila.d@hormail.it';

UPDATE auth.users
SET email = 'danila.d@hotmail.it',
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email}',
      to_jsonb('danila.d@hotmail.it'::text),
      true
    ),
    updated_at = now()
WHERE id = '703553cb-dd5e-4e07-982c-995480be3377'
  AND lower(email) = 'danila.d@hormail.it';
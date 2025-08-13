
-- Storage policies for medical certificate files

-- Allow users to upload files only within their own folder: {auth.uid()}/...
create policy "Users can upload own medical certificates"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'medical-certificates'
  and name like auth.uid()::text || '/%'
);

-- Allow users to read their own medical certificates
create policy "Users can read own medical certificates"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'medical-certificates'
  and name like auth.uid()::text || '/%'
);

-- Allow gym owners to read medical certificates of members in their gym
create policy "Gym owners can read medical certificates of their gym"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'medical-certificates'
  and exists (
    select 1
    from public.medical_certificates mc
    where mc.file_path = name
      and mc.gym_id = public.get_user_gym_id(auth.uid())
  )
);

-- Allow admins to read all medical certificates
create policy "Admins can read all medical certificates"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'medical-certificates'
  and public.has_role(auth.uid(), 'admin'::app_role)
);

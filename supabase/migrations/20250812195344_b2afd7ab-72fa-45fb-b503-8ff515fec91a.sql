
-- Consente ai gym_owner di inserire membership per la propria palestra
create policy "Gym owners can add memberships for their gym"
on public.user_gym_memberships
for insert
with check (
  has_role(auth.uid(), 'gym_owner'::app_role)
  and gym_id = get_user_gym_id(auth.uid())
);

-- Consente ai gym_owner di aggiornare membership della propria palestra
create policy "Gym owners can update memberships for their gym"
on public.user_gym_memberships
for update
using (
  has_role(auth.uid(), 'gym_owner'::app_role)
  and gym_id = get_user_gym_id(auth.uid())
)
with check (
  has_role(auth.uid(), 'gym_owner'::app_role)
  and gym_id = get_user_gym_id(auth.uid())
);

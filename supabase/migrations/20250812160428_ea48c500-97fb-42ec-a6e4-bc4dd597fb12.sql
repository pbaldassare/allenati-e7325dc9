
-- Consente a chiunque (utenti anonimi o autenticati) di vedere le palestre attive
create policy "Chiunque può vedere le palestre attive"
on public.gyms
for select
to authenticated, anon
using (is_active = true);

## Problema trovato
La query di registrazione verso `gyms` fallisce ancora con:

```text
permission denied for function has_role
```

La causa non è più la policy owner già corretta, ma la policy esistente **"Admins can manage all gyms"**: è definita per il ruolo `public`, quindi viene valutata anche dagli utenti non loggati durante la registrazione. Questa policy chiama `has_role(...)`, ma `anon` non ha permesso di eseguire quella funzione, quindi Supabase blocca tutta la lettura delle palestre.

## Piano di correzione
1. Aggiornare le policy RLS su `public.gyms`:
   - mantenere una policy separata per utenti non loggati che mostra solo palestre attive;
   - mantenere una policy separata per utenti autenticati che mostra le palestre attive;
   - ricreare **"Admins can manage all gyms"** limitandola a `authenticated`, così `anon` non valuta più `has_role(...)`.

2. Verificare con una chiamata anonima alla REST API Supabase che:
   - `/gyms?select=id,name,city&is_active=eq.true` risponda `200`;
   - vengano restituite le 10 palestre attive già presenti nel database.

3. Non modificare il frontend: `RegisterForm.tsx` sta già chiamando correttamente `gyms` con `id`, `name`, `city` e `is_active = true`; il problema è solo RLS.

## Dettaglio tecnico
La migrazione applicherà questa logica:

```sql
DROP POLICY IF EXISTS "Admins can manage all gyms" ON public.gyms;

CREATE POLICY "Admins can manage all gyms"
ON public.gyms
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

Le policy anon/auth per la lettura delle palestre attive resteranno separate, evitando che funzioni riservate agli utenti loggati vengano valutate durante la registrazione.
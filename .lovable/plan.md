## Problema

In fase di registrazione (utente non ancora loggato = ruolo `anon`) la chiamata `SELECT ... FROM gyms WHERE is_active = true` fallisce con:

```
permission denied for function get_user_gym_id
```

Causa: sulla tabella `gyms` esistono policy SELECT "Gym owners can view their gym" applicate al ruolo `public` (quindi anche `anon`). Postgres valuta tutte le policy SELECT in OR; per `anon` prova a eseguire `get_user_gym_id(auth.uid())` e `instructor_has_owner_privileges(auth.uid())`, per le quali `anon` non ha EXECUTE → l'intera query viene rifiutata, anche se la policy "Chiunque può vedere le palestre attive" sarebbe sufficiente.

## Fix (solo backend, nessuna modifica UI)

Migration SQL:

1. Ricreare la policy "Gym owners can view their gym" su `gyms` limitandola al ruolo `authenticated` (così `anon` non esegue mai quelle funzioni).
2. Stessa cosa per la policy UPDATE "Gym owners can update their gym".
3. Lasciare invariata "Chiunque può vedere le palestre attive" (anon, authenticated) e "Admins can manage all gyms".

Risultato: durante la registrazione `anon` valuta solo la policy pubblica → lista palestre attive caricata correttamente. Owner/istruttori autenticati mantengono accesso completo alla propria palestra.

## File toccati

- Nuova migration Supabase (DROP + CREATE POLICY sulle due policy owner su `gyms`).
- Nessuna modifica a `RegisterForm.tsx` o altri file frontend.

## Verifica

- Aprire `/auth` in incognito → il select "Palestra" mostra le palestre attive, niente toast di errore.
- Login come gym_owner → continua a vedere/aggiornare la propria palestra.

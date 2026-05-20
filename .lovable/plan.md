## Stato generale del sistema

Ho controllato app web, log auth, log edge function e database linter.

### App / Frontend
- Il fix del loop infinito in `SessionManagementDrawer` ha risolto il crash che bloccava il caricamento delle pagine. Console attuale: nessun errore, query partecipanti completata in 271 ms.
- Ho cercato pattern simili (`ref={setXxx}` con `useState`, ref-callback fragili) in tutto `src/` — nessun altro caso trovato.

### Auth (Supabase)
- Login normali e funzionanti negli ultimi minuti (più utenti diversi da IP diversi, status 200).
- Un solo `400: Invalid login credentials` (utente che ha sbagliato password) e un `refresh_token_not_found` post-logout — entrambi attesi, non bug.

### Edge functions
- `send-booking-confirmation`: avviata e completata correttamente.
- `send-push-notification`: risponde `All included players are not subscribed` — significa che l'utente target non ha registrato il device su OneSignal. Non è un errore del sistema, è uno stato dell'utente. Eventualmente vale la pena gestire questo caso come warning silenzioso lato edge function.

### Database linter (187 warning, nessun errore)
Sono quasi tutti warning di sicurezza ricorrenti, non bloccanti:
- ~160 funzioni con `search_path` mutable o `SECURITY DEFINER` eseguibile da utenti autenticati.
- `Auth OTP long expiry` (scadenza OTP troppo lunga).
- `Leaked Password Protection Disabled`.
- `Postgres version has security patches available` (upgrade DB disponibile).

Nessuna tabella senza RLS, nessuna policy permissiva, nessun problema critico.

## Proposta

Nessun intervento urgente. Se vuoi proseguire posso:
1. **Hardening DB** — fixare in batch i `search_path` mancanti e rivedere i `SECURITY DEFINER` per restringere `EXECUTE` solo dove serve.
2. **Auth hardening** — accorciare scadenza OTP e abilitare la Leaked Password Protection in Supabase Auth.
3. **Upgrade Postgres** dalla dashboard Supabase per applicare le security patch.
4. **Edge function push** — silenziare il caso "player not subscribed" così non sembra un errore nei log.

Fammi sapere quale (o quali) vuoi che io affronti adesso e procedo.
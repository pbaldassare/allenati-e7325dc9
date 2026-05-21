# Audit & Robustness — Allenati WebApp

## Cosa ho trovato nell'analisi

**Routing & Pagine (App.tsx)**
- ~100 route importate **staticamente**: bundle iniziale gigantesco → caricamento iniziale lento, soprattutto su mobile/3G. Una pagina lenta blocca tutta la app.
- Nessun **ErrorBoundary**: un errore runtime in qualunque pagina produce schermata bianca (è il sintomo che hai visto nei giorni scorsi su `SessionManagementDrawer`).
- Nessun `<Suspense>` né `React.lazy` → impossibile mostrare uno spinner per pagina.

**React Query (`new QueryClient()` senza opzioni)**
- Nessun retry intelligente, nessun `staleTime`, nessun `refetchOnWindowFocus: false`. Risultato: ad ogni focus la app rifà decine di query → carico inutile su Supabase e flicker UI.

**Auth/Session**
- `useAuthRedirect` logga molto su console (rumore in produzione) e fa redirect anche durante caricamenti parziali → micro-loop di navigazione.
- Errore ricorrente nei log: `Invalid Refresh Token: Refresh Token Not Found` non gestito in modo "soft" (l'utente vede errore console). Va intercettato e ridotto a logout silenzioso.

**Gestione errori asincroni**
- 28 `console.error/throw` in `SessionManagementDrawer`, 19 in `OwnerCoursesList`, 17 in `OwnerUsers`: nessuno bubble-uppa a un boundary, nessun toast utente uniforme.
- Mancano abort/cleanup nei `fetch` quando il componente si smonta → "Can't perform state update on unmounted" sporadici.

**Supabase Linter**
- Restano 71 warning (giù da 187 ieri). I bloccanti reali sono:
  - 1 extension nello schema `public`
  - 1 bucket pubblico con SELECT troppo aperto
  - ~60 `SECURITY DEFINER` chiamabili da `authenticated` — la maggior parte sono usati dalle policy RLS e devono restare; vanno revisionati solo quelli non referenziati.

---

## Piano di lavoro (in ordine di impatto)

### 1. Stabilità runtime (priorità massima)
- Aggiungere un **`<ErrorBoundary>` globale** che cattura crash di pagina e mostra un fallback "Qualcosa è andato storto / Ricarica" invece dello schermo bianco.
- Wrappare anche le aree `admin/owner/instructor` con boundary **per-area** (un crash in `/owner` non rompe `/`).

### 2. Performance di caricamento
- Convertire le route in `React.lazy` + `<Suspense fallback={Spinner}>`: bundle iniziale −60/70%, time-to-interactive molto più rapido.
- Mantenere eager solo `Index`, `Auth`, `NotFound` (le rotte d'ingresso).

### 3. React Query stabilità
- Configurare `QueryClient` con:
  - `staleTime: 30_000`
  - `refetchOnWindowFocus: false`
  - `retry: 1` (evita raffica di richieste su 401/403)
- Evita refetch a cascata su tab change, riduce errori "rate limit" e flicker.

### 4. Auth resilience
- Listener `supabase.auth.onAuthStateChange`: su `TOKEN_REFRESHED` failed o `SIGNED_OUT`, pulire sessione e portare a `/auth` senza errori in console.
- Rimuovere i `console.log` rumorosi di `useAuthRedirect` (mantengo solo errori).
- Throttle dei redirect: niente navigate finché `loading || (isAuthenticated && !user?.role)`.

### 5. Sanitizzazione fetch & memory leak
- Sweep dei top-5 file ad alto rischio (`SessionManagementDrawer`, `OwnerCoursesList`, `OwnerUsers`, `Dashboard`, `OwnerInstructors`):
  - aggiungere `isMounted` / `AbortController` ai `useEffect` con async.
  - sostituire `console.error` "muti" con `toast` utente + log centralizzato.

### 6. Pulizia Supabase (warning residui, basso rischio)
- Verificare il bucket pubblico segnalato e restringere la policy `SELECT` solo a file effettivamente pubblici.
- Spostare l'extension fuori dallo schema `public` se non è `pg_trgm` (alcune sono "false positive" e vanno lasciate — verifico una per una).
- Lascio così i `SECURITY DEFINER` chiamati dalle RLS (rompere sarebbe peggio).

### 7. Monitoraggio
- Logger centralizzato `src/lib/logger.ts` con livelli (debug/info/error). In produzione solo `error`. Predispone integrazione futura con Sentry/Logflare.

---

## Dettagli tecnici (per riferimento)

```text
src/
  components/ErrorBoundary.tsx          [NEW] class component + fallback UI
  lib/logger.ts                         [NEW] log centralizzato
  App.tsx                               lazy() + Suspense + QueryClient config
                                        + <ErrorBoundary> root
  hooks/useAuthRedirect.ts              ripulito + guard refresh-token
  contexts/AuthContext.tsx              gestione onAuthStateChange robusta
```

Migrazione SQL solo se l'utente conferma il punto 6 (rischio rottura).

---

## Cosa NON faccio in questo giro
- Refactor visivi o cambi UX.
- Nessuna modifica a edge functions / business logic / RLS esistenti.
- Nessun aggiornamento di Postgres (richiede dashboard Supabase).

---

## Fammi sapere
Procedo con **punti 1-5 + 7** (frontend hardening, zero rischio di rottura dati)? Il punto 6 lo affrontiamo dopo, una warning alla volta, perché tocca il DB.
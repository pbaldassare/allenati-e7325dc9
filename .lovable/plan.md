# Fix conteggio posti scheda lato utente (3/4 vs 4/4)

## Causa

Sulla sessione `lezione di Gruppo Pilates Reformer` del 12/05 alle 18:30 (max 4):

- **Bookings reali in DB**: 4 confermate + 4 cancellate.
- **Owner**: conta in tempo reale le booking `confirmed` → mostra correttamente **4/4**.
- **Utente** (`src/components/Dashboard.tsx`): legge `session.available_spots` dal record `course_sessions` e calcola `participants = max_participants - available_spots`.
- Per quella sessione `available_spots = 1` (dovrebbe essere `0`) → l'utente vede **3/4**.

Il trigger `update_session_spots_on_booking_change` esiste ed è corretto, ma il valore `available_spots` è andato in **drift storico** (probabilmente per booking inserite/modificate prima che il trigger esistesse o tramite path che lo ha bypassato). Il trigger nuovo non recupera il drift passato.

## Fix in due parti

### 1. Backfill una tantum (migration)

Funzione + UPDATE che ricalcola `available_spots` per **tutte** le sessioni:

```text
available_spots = max_participants - count(bookings WHERE session_id = cs.id AND status = 'confirmed')
clamp tra 0 e max_participants
```

Includo anche una funzione utility `recalculate_session_available_spots(p_session_id uuid)` (SECURITY DEFINER, search_path=public) richiamabile per riallineare singole sessioni in caso di futuri drift (utile per cron o chiamate puntuali).

### 2. Hardening lato UI utente

Nel `Dashboard.tsx` (utente) cambiare la fonte di verità del conteggio: invece di fidarsi di `session.available_spots`, contare in tempo reale le booking `confirmed` per le sessioni mostrate (stesso approccio dell'owner). Il campo `available_spots` resta valido per la logica di "posti rimasti" pre-prenotazione, ma il display "X/Y" diventa allineato a quello dell'owner.

Implementazione:
- Dopo aver caricato le sessioni del giorno, fare un'unica query `bookings` con `select('session_id', { count: 'exact' })` filtrata su `session_id IN (...)` e `status = 'confirmed'`, raggruppata client-side in una mappa `sessionId → confirmedCount`.
- Il valore `participants` mostrato nelle card usa quella mappa, con fallback a `max_participants - available_spots` se la mappa non ha il dato.

### 3. Cosa NON cambio

- Non tocco il trigger `update_session_available_spots` (è corretto).
- Non cambio la logica di prenotazione né le RLS.
- Non rimuovo `available_spots` dallo schema (resta usato per altre views).

## Risultato atteso

- La sessione 18:30 mostrerà **4/4** anche all'utente.
- Tutte le sessioni esistenti vengono allineate dal backfill.
- Anche se in futuro dovesse ricomparire drift sul campo, il display utente resterà corretto perché basato sul count reale.

## Test post-deploy

1. Sessione di test con bookings miste → owner e utente mostrano lo stesso conteggio.
2. Prenotare e cancellare → entrambi i lati aggiornati al refresh.
3. Sessione del 12/05 18:30 → 4/4 anche lato utente.

# Fix — Ricerca utenti "un carattere alla volta" + prenotazioni mancanti per data

## Problema 1 — Ricerca utenti: la digitazione si "rompe" dopo ogni carattere

Cause confermate leggendo `SessionManagementDrawer.tsx`:

- L'`Input` ha un `onFocus` che, su mobile + tastiera aperta, lancia `searchInputRef.current.scrollIntoView({ block: 'center' })` dopo 300 ms. Quando compaiono i risultati il layout si sposta, l'input perde il viewport e iOS chiude la tastiera; per scrivere il carattere successivo bisogna ritoccare la casella → effetto "uno alla volta".
- La lista risultati ha `max-h-32` (128 px) ed è renderizzata dentro `<div className="p-4 border-b bg-muted/30">`: viene comunque inserita nel flusso → spinge in basso il resto del drawer ad ogni keystroke, peggiorando lo shift.
- Il mio recente `setSearching(true)` viene chiamato **fuori** dal debounce, quindi re-renderizza il blocco ad ogni tasto, amplificando il reflow.

### Soluzione
In `src/components/owner/SessionManagementDrawer.tsx`:
1. Rimuovere completamente l'`onFocus` con `scrollIntoView`: non serve, l'input è già visibile sopra il drawer e lo scroll automatico è la causa del problema.
2. Spostare `setSearching(true)` **dentro** il `setTimeout` del debounce, così lo stato di loading non cambia ad ogni tasto.
3. Rendere stabile l'area risultati: riservare uno spazio (min-height) costante per il blocco "loading / no-results / lista", così il layout non si sposta sotto la tastiera.
4. Alzare leggermente la max-height della lista (`max-h-56`) e renderla scrollabile.

## Problema 2 — Owner: alcune prenotazioni non compaiono quando filtro per data

Causa confermata su DB: la palestra principale ha **~9.980 prenotazioni** totali. `useOwnerBookings` fa una singola `select` su `bookings` senza paginazione → Supabase tronca a **1000 righe** (limite PostgREST di default). Le date più vecchie del 1000-esimo record non appaiono mai, nemmeno applicando il filtro `dateFrom/dateTo` (che è client-side su un array già troncato).

### Soluzione
In `src/hooks/useOwnerBookings.ts`:
1. Accettare opzionalmente `dateFrom` / `dateTo` come parametri del hook (firma: `useOwnerBookings({ dateFrom?, dateTo? })`, retrocompatibile con default `undefined`).
2. Quando sono presenti, aggiungere `.gte('scheduled_date', dateFrom)` e `.lte('scheduled_date', dateTo)` direttamente sulla query Supabase → filtra server-side, niente troncamento.
3. Aggiungere paginazione automatica: ciclare con `.range(offset, offset+999)` finché la pagina ritorna 1000 righe (fino a un cap di sicurezza, es. 20.000 record) — così anche senza filtro data l'owner vede tutto.
4. In `OwnerBookings.tsx`, passare `dateFrom`/`dateTo` al hook e rimuovere il filtro client-side per quelle due date (gli altri filtri — testo, status, dateFilter rapido — restano client-side).
5. Mostrare un piccolo badge "Caricate N prenotazioni" sopra la tabella per dare feedback su quante righe sono state recuperate.

## Cosa NON tocco
- Nessuna modifica al DB / RLS.
- Nessuna modifica alla logica di cancellazione, conteggio crediti, lista d'attesa.
- Nessuna modifica alle altre pagine owner.

Procedo con questi due fix?
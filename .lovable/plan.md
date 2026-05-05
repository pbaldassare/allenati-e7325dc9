## Obiettivo

Ripristinare la visualizzazione di **data e ora di cancellazione** nella pagina `/owner/bookings` (Gestione Prenotazioni), come era in precedenza.

## Stato attuale

La tabella desktop mostra le colonne: Utente, Corso, Sala, Data/Ora, Crediti, Stato, Prenotato, Azioni.
Il campo `cancelled_at` (e `cancellation_reason`) è già presente nei dati restituiti da `useOwnerBookings`, ma non viene mostrato in tabella.

## Modifiche

### `src/pages/owner/OwnerBookings.tsx`

1. **Aggiungere colonna "Cancellata il"** nella tabella desktop (dopo "Prenotato"):
   - Se `booking.status === 'cancelled'` e `booking.cancelled_at` esiste → mostrare data + ora in formato `it-IT` (es. `05/05/2026 14:32`).
   - Se è disponibile `cancellation_reason`, mostrarlo come riga secondaria in `text-muted-foreground` (testo piccolo, eventualmente troncato).
   - Altrimenti mostrare `—`.

2. Nessuna modifica alla logica dei filtri o alle altre colonne.

## File coinvolti

```text
src/pages/owner/OwnerBookings.tsx   (aggiunta colonna in TableHeader + TableBody)
```

## Verifiche

- Filtrare per stato "Cancellate" → ogni riga mostra data/ora di cancellazione corretta.
- Prenotazioni confermate mostrano `—` nella nuova colonna.


# Ricollega prenotazioni "orfane" alle sessioni (e prevenzione futura)

## Problema confermato dai dati

Sulla sessione "Pilates reformer" 08/06 10:30:
- 4 prenotazioni confermate per quella data/ora
- Solo 3 hanno `session_id` valorizzato → la UI mostra 3/5
- 1 prenotazione ha `session_id = NULL` (è quella "invisibile")

In totale nel DB: **5.081 prenotazioni con `session_id = NULL`** (di cui 5 future + ~3.600 passate confermate). Stessa rottura su altre sessioni (es. 08/06 16:30: 5 prenotazioni reali, solo 3 collegate).

**Causa**: quando l'RPC `smart_generate_sessions_with_weeks` elimina/ricrea una sessione, le prenotazioni perdono il puntamento (`session_id` diventa NULL o punta a una sessione cancellata). Non vengono mai ricollegate alla nuova sessione equivalente (stesso corso + stessa data + stessa ora).

## 1. Backfill: ricollega tutte le prenotazioni orfane

Migrazione UPDATE che per ogni `bookings` con `session_id IS NULL` cerca una `course_sessions` con stesso `course_id` + `session_date = scheduled_date` + `start_time = scheduled_time` e la collega. Vale sia per prenotazioni future (immediato beneficio nell'UI) che passate (storico coerente).

```sql
UPDATE bookings b
   SET session_id = s.id
  FROM course_sessions s
 WHERE b.session_id IS NULL
   AND s.course_id = b.course_id
   AND s.session_date = b.scheduled_date
   AND s.start_time  = b.scheduled_time;
```

## 2. Auto-link al rigenero sessioni

Trigger `AFTER INSERT` su `course_sessions`: appena una nuova sessione viene creata, collega automaticamente tutte le prenotazioni orfane che combaciano per corso+data+ora. Così quando l'owner modifica/rigenera gli orari, le prenotazioni esistenti restano "agganciate" alla nuova sessione senza intervento manuale.

## 3. Patch RPC `smart_generate_sessions_with_weeks`

Prima di eliminare una sessione futura, spostare le sue prenotazioni sulla sessione "equivalente" che si sta per creare (stesso course_id + day_of_week + start_time). Oggi la RPC cancella la sessione e le prenotazioni restano scollegate. Aggiunta di un `UPDATE bookings SET session_id = <new> WHERE session_id = <old>` prima della DELETE.

## 4. Aggiornamento `available_spots` post-backfill

Dopo il backfill, ricalcolare `available_spots` di tutte le sessioni future:
```sql
UPDATE course_sessions s
   SET available_spots = s.max_participants -
       (SELECT COUNT(*) FROM bookings b WHERE b.session_id = s.id AND b.status='confirmed')
 WHERE s.session_date >= CURRENT_DATE;
```

## Aspetti tecnici

- Migrazione unica con: backfill bookings, trigger auto-link, ricalcolo `available_spots`, riscrittura RPC.
- Nessun cambio a RLS, nessuna nuova colonna, nessun impatto su prenotazioni cancellate.
- Idempotente: il trigger non duplica nulla, il backfill aggiorna solo dove `session_id IS NULL`.

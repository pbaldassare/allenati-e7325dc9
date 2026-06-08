
# Fix sala collegata a sessioni e prenotazioni

## Problema
- `course_schedules` contiene la sala corretta (es. OPEN GYM → Sala Pesi).
- `course_sessions` generate hanno `room_id = NULL` → sessioni mostrano "Non specificata".
- ~1.823 sessioni future + 214 prenotazioni passate hanno la sala mancante.

## 1. Fix RPC di generazione sessioni
Patchare `smart_generate_sessions_with_weeks` perché, ad ogni `INSERT` in `course_sessions`, copi `room_id` e `room_name` (joinando `gym_rooms`) dallo `course_schedules` di origine. Da questo momento ogni nuova sessione nasce con la sala corretta.

## 2. Backfill sessioni esistenti (automatico, no mappa manuale)
Una migrazione UPDATE che, matchando per `course_id` + `day_of_week` + `start_time`, ripopola `room_id` e `room_name` di tutte le sessioni rotte usando i dati già presenti negli schedule:

```sql
UPDATE course_sessions cs
   SET room_id   = sch.room_id,
       room_name = r.name
  FROM course_schedules sch
  JOIN gym_rooms r ON r.id = sch.room_id
 WHERE cs.course_id = sch.course_id
   AND EXTRACT(DOW FROM cs.session_date) = sch.day_of_week
   AND cs.start_time = sch.start_time
   AND (cs.room_id IS NULL OR cs.room_name IS NULL OR cs.room_name = 'Sala non specificata');
```

## 3. Snapshot storico immutabile su prenotazioni
- Aggiungere colonna `room_id_snapshot uuid` su `bookings`.
- Trigger `BEFORE INSERT` che copia `room_id` + `room_name` dalla `course_sessions` collegata. Una volta inserita, la prenotazione **non cambia mai più**: se domani la sala del corso viene modificata o cancellata, le prenotazioni vecchie continuano a mostrare la sala originale.
- Backfill `room_name_snapshot` + `room_id_snapshot` **solo sulle prenotazioni future** (status = confirmed, scheduled_date ≥ oggi) usando i dati appena sistemati al punto 2.
- Le prenotazioni passate con "Sala non specificata" restano com'erano (storico fedele a com'era allora).

## 4. Validazione preventiva nell'UI Owner
In `CourseScheduleManager` / `CourseFormWithSessions`: rendere il campo "Sala" obbligatorio. Il pulsante Salva è disabilitato finché ogni riga di schedule non ha una sala selezionata, con messaggio chiaro.

## Aspetti tecnici
- Migrazione unica con: nuova colonna, trigger, UPDATE backfill sessioni, UPDATE backfill prenotazioni future.
- RPC `smart_generate_sessions_with_weeks` riscritta mantenendo firma e comportamento attuale (idempotenza, gestione exceptions), aggiungendo solo i due campi sala nell'INSERT.
- Frontend: edit puntuale di `CourseScheduleManager.tsx` per validazione + disable Salva.
- Nessun cambio a RLS, nessun impatto su autenticazione, nessun impatto sulle prenotazioni passate.

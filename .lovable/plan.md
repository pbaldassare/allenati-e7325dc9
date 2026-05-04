## Problema

Quando l'owner modifica un corso (cambio orario, giorno, sala o anche istruttore con re-salvataggio degli schedule), alcune persone già prenotate **spariscono dal calendario**.

## Causa (verificata su DB e codice)

Il salvataggio chiama in cascata due funzioni Postgres:

1. `update_schedule_sessions` — quando un orario viene **modificato**, le sessioni future con prenotazioni vengono "preservate" (lasciate al vecchio giorno/ora), quelle senza prenotazioni vengono spostate al nuovo orario.
2. `smart_generate_sessions_with_weeks` — viene chiamata **subito dopo**: ricostruisce `course_schedules`, calcola le chiavi attive `(day_of_week, start_time)` dei nuovi schedule, poi fa un loop su tutte le sessioni future e **cancella (status='cancelled') sessione + bookings** per ogni sessione la cui chiave non matcha i nuovi schedule.

Le sessioni preservate al passo 1 (vecchio giorno/ora) vengono quindi distrutte al passo 2, con motivo "Orario rimosso", e le prenotazioni passano a `cancelled`. Da qui:
- nel calendario owner il count partecipanti si abbassa,
- nel drawer della sessione la query filtra `status = 'confirmed'` e quei partecipanti non compaiono più.

Stesso effetto per cambio di sala combinato con cambio orario, e potenzialmente per qualunque salvataggio del corso che ri-passi gli schedule alla RPC anche se l'utente ha solo toccato campi non legati allo schedule.

## Obiettivo

Una modifica al corso **non deve mai** cancellare prenotazioni già confermate sulle sessioni future. Le sessioni con bookings esistenti devono restare visibili nel calendario nella loro forma originale finché l'owner non agisce esplicitamente su di esse.

## Soluzione

### 1. Migrazione DB — proteggere le sessioni con prenotazioni

Aggiornare `smart_generate_sessions_with_weeks` (signature principale, quella con `p_schedules`):

- Nel "Step 3" del loop di pulizia, prima di cancellare una sessione la cui chiave non matcha più i nuovi schedule:
  - Se la sessione ha bookings in stato `confirmed` o `waitlist` → **non toccarla**: lasciarla col vecchio orario/sala come "orfana protetta", così il partecipante resta visibile e la prenotazione resta `confirmed`.
  - Se la sessione non ha bookings → comportamento attuale (DELETE).
- Solo le sessioni **senza prenotazioni** entrano nella logica di delete/cancel di pulizia.
- Mantenere il comportamento attuale per le sessioni esplicitamente cancellate dall'owner tramite UI dedicata (drawer "Cancella sessione"), che usano un percorso separato.

Stessa protezione va garantita anche nel ramo che gestisce eventuali ON CONFLICT del passo 4: nessuna UPDATE deve modificare `room_id`/`max_participants` su una sessione con bookings confermate (mantenere lo snapshot di prenotazione coerente).

### 2. Migrazione DB — non rigenerare schedule se non sono cambiati

Nel client, oggi il salvataggio del form corso passa sempre la lista completa di schedule alla RPC. Aggiungere un guardia nella RPC: se l'array `p_schedules` ricevuto è **identico** all'attuale contenuto di `course_schedules` per quel corso (stessi giorni/ore/sale/override), saltare il DELETE+INSERT dei `course_schedules` e la rigenerazione delle sessioni. Evita rigenerazioni non necessarie quando l'owner cambia solo nome/descrizione/istruttore.

### 3. Frontend — chiamare la rigenerazione solo se gli schedule cambiano

In `src/components/admin/CourseFormWithSessions.tsx` e nei flussi owner equivalenti (`OwnerCourseEdit`, `OwnerCourseForm`), separare il salvataggio in due percorsi:

- **Solo metadati corso** (nome, descrizione, istruttore, immagine, requisiti, ecc.): UPDATE diretta su `courses`, **niente** chiamata a `smartUpdateCourseSchedules`.
- **Schedule modificati**: percorso attuale tramite `smartUpdateCourseSchedules`.

Il rilevamento avviene confrontando lo state degli schedule con `originalDayOfWeek/originalTime/roomId/...` già presenti su `ScheduleItem`.

### 4. UX — feedback chiaro nel dialog di salvataggio

In `SaveScheduleConfirmDialog` distinguere chiaramente i due casi:
- Sessioni che verranno **spostate** (senza prenotazioni).
- Sessioni che verranno **mantenute al vecchio orario** perché hanno prenotazioni, con count e nota "I partecipanti restano confermati. Per spostarli, cancella manualmente la sessione dal calendario."

Nessuna prenotazione viene mai cancellata in automatico. Se l'owner vuole forzare lo spostamento dei partecipanti deve farlo manualmente dalla sessione.

## File coinvolti

```text
DB:
  smart_generate_sessions_with_weeks (RPC)  → migration

Frontend:
  src/lib/smartSessionManager.ts             → split logica salva schedule
  src/components/admin/CourseFormWithSessions.tsx
  src/pages/owner/OwnerCourseEdit.tsx
  src/components/owner/OwnerCourseForm.tsx
  src/components/dialogs/SaveScheduleConfirmDialog.tsx
```

## Verifiche post-fix

1. Modificare nome/istruttore di un corso con bookings confermate → 0 sessioni toccate, 0 bookings cancellate, calendario invariato.
2. Spostare uno schedule lunedì 18:00 → martedì 19:00 con 3 partecipanti già prenotati al lunedì → le 3 sessioni con bookings restano al lunedì, le sessioni future senza bookings appaiono al martedì, i 3 partecipanti restano visibili nel calendario.
3. Cambiare sala a uno schedule senza cambiare orario → sessioni future con bookings mantengono la vecchia sala (con badge "preservata"), nuove sessioni nascono nella nuova sala.
4. Cancellare manualmente una sessione preservata dal drawer → bookings rimborsate normalmente (flusso esistente).

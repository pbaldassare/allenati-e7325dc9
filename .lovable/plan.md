# Validazione hard attivazione corso

Impedire che un corso possa avere `is_active = true` senza avere almeno **uno schedule attivo con sala valida** (`room_id` non null **oppure** `room_name` non vuoto).

La validazione vive sia a livello database (regola sempre rispettata, anche da query SQL dirette o futuri client) sia a livello UI (esperienza chiara: toast esplicito e bottone disattivato quando manca la sala).

## 1. Regola di validità (definizione unica)

Un corso può essere attivo se e solo se esiste almeno una riga in `course_schedules` con:
- `course_id = courses.id`
- `is_active = true`
- `room_id IS NOT NULL` **oppure** `room_name` non vuoto (`trim() <> ''`)

## 2. Database — trigger `BEFORE INSERT/UPDATE` su `courses`

Funzione `validate_course_activation()` con `SECURITY DEFINER` e `search_path = public`:
- Se `NEW.is_active = true` e (su INSERT, oppure su UPDATE quando `OLD.is_active` era false o `NEW` non aveva ancora schedule), conta gli schedule validi del corso.
- Se zero, solleva `RAISE EXCEPTION 'COURSE_ACTIVATION_NO_VALID_SCHEDULE'` con un MESSAGE leggibile in italiano.
- Trigger `BEFORE INSERT OR UPDATE OF is_active ON public.courses`.

Trigger speculare `BEFORE UPDATE/DELETE` su `course_schedules`:
- Se l'azione lascia il corso senza nessuno schedule valido **e** il corso è `is_active = true`, disattiva automaticamente il corso (`UPDATE courses SET is_active = false`) e logga un record in `admin_action_logs` (action: `course_auto_deactivated_no_schedule`).
- Questo evita stati incoerenti se l'owner cancella l'ultimo schedule o ne rimuove la sala su un corso attivo.

Nota: i 18 corsi orfani esistenti restano tali (non li tocchiamo in questa migrazione, sono già "rotti" lato visibilità ma non bloccano nulla). Vengono gestiti dalla UI al punto 3.

## 3. UI — Owner (e specchio Admin)

### `OwnerCourseForm.tsx`
- Caricare il conteggio schedule validi del corso.
- Se zero: il toggle `is_active` è **disabilitato** con tooltip "Aggiungi prima almeno un orario con sala assegnata".
- Submit: try/catch sull'errore Postgres; se contiene `COURSE_ACTIVATION_NO_VALID_SCHEDULE` mostra toast destructive con lo stesso messaggio e mantiene il form aperto.

### `OwnerCoursesList.tsx`
- Nella query corsi, includere `course_schedules!inner` filtrato per validità oppure aggiungere un campo derivato `has_valid_schedule` (count via subquery).
- Bottone "Attiva" disabilitato (con tooltip) se `!has_valid_schedule`.
- Badge aggiuntivo `Senza orario` accanto allo stato per i corsi `is_active = false` privi di schedule valido, così l'owner identifica subito i 18 orfani.
- Toggle attivazione: catch errore trigger → toast.

### `OwnerCourseNew.tsx`
- Cambiare la creazione da `is_active: true` a `is_active: false` (un corso nuovo non ha ancora schedule, quindi non può essere attivo). Aggiungere toast "Corso creato. Aggiungi un orario con sala per poterlo attivare." e redirect alla pagina schedules del nuovo corso.

### `OwnerCourseSchedules.tsx`
- Dopo aver salvato il primo schedule valido, mostrare CTA "Attiva corso" inline (chiama lo stesso endpoint del toggle).

### Admin (`AdminCourseEdit`, `AdminCoursesList`)
- Stesso comportamento di Owner. Admin può comunque ignorare il blocco solo passando da Supabase; il trigger DB protegge anche lì (no bypass possibile).

## 4. Cosa NON fa questo intervento

- Non disattiva i 18 corsi orfani esistenti (non sono attivi in modo "pericoloso", sono solo incompleti — restano visibili all'owner con il badge `Senza orario`).
- Non altera la logica di `smart_generate_sessions_with_weeks`.
- Non cambia le RLS policy.

## 5. Dettagli tecnici

```text
courses.is_active = true  ─────────────► richiede esistenza di
                                         course_schedules dove:
                                           course_id = courses.id
                                           is_active = true
                                           (room_id IS NOT NULL
                                            OR trim(room_name) <> '')
```

Migration:
- `validate_course_activation()` + trigger su `courses`
- `enforce_course_active_on_schedule_change()` + trigger su `course_schedules`
- Entrambe `SECURITY DEFINER` con `SET search_path = public` (rispetta memoria security).

Codice TS:
- Helper `useCourseHasValidSchedule(courseId)` riusabile in form e lista.
- Mappatura errore: util `mapCourseActivationError(err)` che riconosce il codice e ritorna messaggio italiano.

## 6. Test manuali post-deploy

1. Corso senza schedule → toggle disabilitato + tooltip.
2. Corso con schedule senza sala → toggle disabilitato.
3. Corso con schedule + sala → toggle abilitato, attivazione ok.
4. Corso attivo → cancello l'ultimo schedule → corso si disattiva da solo, log creato.
5. Tentativo `UPDATE courses SET is_active=true` da SQL su corso orfano → errore Postgres.

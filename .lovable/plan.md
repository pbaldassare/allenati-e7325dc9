Problema da correggere: nel lato utente la pagina e il popup prenotazione leggono l’istruttore in modo non coerente. In particolare `BookingConfirmDialog` usa un helper che cerca `instructors.profiles`, mentre la query della Dashboard spesso porta `instructors.first_name/last_name` direttamente; inoltre l’eventuale `course_sessions.instructor_id_override` non viene rispettato nel popup.

Piano di intervento:

1. Centralizzare la risoluzione del nome istruttore
   - Creare/aggiornare un helper unico per ricavare il nome istruttore da più forme dati già presenti nel progetto:
     - `instructors.profiles.first_name/last_name`
     - `instructors.first_name/last_name`
     - snapshot o oggetti istruttore passati dalla sessione
   - Fallback solo quando non c’è davvero nessun dato utilizzabile.

2. Correggere la Dashboard lato utente
   - Aggiornare la query delle sessioni disponibili per caricare sia:
     - istruttore assegnato al corso (`courses.instructor_id`)
     - istruttore override della singola sessione (`course_sessions.instructor_id_override`)
   - Usare sempre l’override della sessione quando presente, altrimenti l’istruttore del corso.
   - Rimuovere i log/debug visibili o rumorosi relativi a date/istruttori se ancora presenti.

3. Correggere il popup “Conferma Prenotazione”
   - Passare al dialog un dato istruttore già normalizzato dalla sessione selezionata, non solo `selectedSession.courses`.
   - Aggiornare `BookingConfirmDialog` per mostrare correttamente il nome istruttore anche quando arriva come `first_name/last_name` diretto e non dentro `profiles`.

4. Allineare gli altri punti lato utente collegati
   - Controllare `CourseCalendar` e prenotazioni utente per evitare lo stesso fallback errato in altre viste.
   - Dove serve, applicare lo stesso helper per mantenere comportamento identico tra card, popup, calendario e storico/prenotazioni.

5. Verifica
   - Aggiungere o aggiornare test mirati sul resolver dell’istruttore: profilo annidato, nome diretto, override sessione, fallback reale.
   - Eseguire i test pertinenti per confermare che il popup non mostri più “Istruttore non assegnato” quando il corso/sessione ha un istruttore valido.
## Problema

La query delle prenotazioni funziona: nei log c'è 1 prenotazione confermata per il 12/06/2026. Però la card non viene renderizzata perché `booking.courses` arriva `null` dopo la rimozione della policy ricorsiva su `courses`, e il componente fa `if (!course) return null`.

## Piano

1. Aggiornare `BookingHistory.tsx` per usare i campi snapshot già presenti nella prenotazione quando `courses` è `null`:
   - `course_name_snapshot`
   - `instructor_name_snapshot`
   - `gym_name_snapshot`
   - `room_name_snapshot`

2. Modificare filtri e ricerca in modo che funzionino anche con i dati snapshot, non solo con `booking.courses.name`.

3. Modificare la card prenotazione per non nascondere più la prenotazione quando manca la relazione `courses`:
   - titolo corso da snapshot
   - istruttore da snapshot
   - palestra/sala da snapshot
   - immagine placeholder se manca `image_url`
   - categoria opzionale solo se disponibile

4. Lasciare invariata la parte database/RLS: non riaggiungo policy su `courses`, così evitiamo di reintrodurre la ricorsione infinita.

## Verifica

Aprire `/i-miei-corsi`: la prenotazione esistente deve comparire nella sezione “Corsi Prenotati” anche se `courses` resta `null`.
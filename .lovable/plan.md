## Problema

Caterina Lorenzi ha 1 prenotazione confermata futura (12/06/2026 11:30, Pilates Reformer) ma non la vede nell'app.

**Causa:** il corso collegato (`a9bddce9-…`) ha `is_active = false`. La RLS attuale su `courses` permette agli utenti di leggere solo i corsi con `is_active = true`. Quando il client carica le prenotazioni con il join `bookings → courses`, il corso torna `null` e la UI scarta/non mostra la riga (nome corso mancante, calendario non lo include).

Questo può accadere a qualunque utente con prenotazioni su corsi che vengono disattivati: le prenotazioni restano nel DB ma "spariscono" dall'app.

## Soluzione

Aggiungere una RLS difensiva su `courses` che consenta all'utente autenticato di leggere i corsi per i quali ha almeno una prenotazione (anche se il corso non è più attivo). Non rende il corso prenotabile, serve solo a far apparire le prenotazioni esistenti nello storico e nel calendario personale.

Non riattivo il corso automaticamente: se era stato disattivato per errore, lo riattivi tu dall'UI Owner; se era voluto, la prenotazione resta visibile e Caterina (o tu) può cancellarla normalmente.

## Cambiamenti

### 1) Migrazione DB

Nuova policy SELECT su `public.courses`:

```sql
CREATE POLICY "Users can view courses they booked"
ON public.courses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.course_id = courses.id
      AND b.user_id = auth.uid()
  )
);
```

La policy è additiva (OR con quelle esistenti): non riduce permessi, aggiunge solo lettura per i corsi prenotati dall'utente. Nessuna ricorsione: `bookings` non ha policy che leggano `courses`.

### 2) Nessuna modifica codice

`useBookings` e `useSessionBookings` già fanno il join verso `courses` — con la nuova policy il corso non sarà più `null` e l'elemento apparirà.

### 3) Verifica

Dopo la migrazione: query come Caterina e confermare che la prenotazione del 12/06 ora viene restituita con `courses.name` valorizzato.

## Fuori scope

- Riattivare il corso: decisione tua dall'UI Owner.
- Cancellare la prenotazione + rimborso: se vuoi farlo, dimmelo e procedo separatamente.

-- Fix della funzione promote_from_waitlist per rimuovere la logica duplicata di increment
-- che causava available_spots > max_participants (es: -1 su 30 partecipanti)

CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
RETURNS TRIGGER AS $$
DECLARE
  next_waitlist_booking RECORD;
BEGIN
  -- Solo quando una prenotazione confermata viene cancellata
  IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' AND OLD.session_id IS NOT NULL THEN
    
    -- Trova il primo in lista d'attesa per questa sessione
    SELECT * INTO next_waitlist_booking
    FROM public.bookings
    WHERE session_id = OLD.session_id
      AND status = 'waitlist'
    ORDER BY waitlist_position ASC
    LIMIT 1;
    
    -- Se c'è qualcuno in waitlist, promuovilo
    IF FOUND THEN
      -- Promuovi a confirmed
      UPDATE public.bookings
      SET status = 'confirmed',
          waitlist_position = NULL,
          updated_at = NOW()
      WHERE id = next_waitlist_booking.id;
      
      -- Ricalcola le posizioni in waitlist per i rimanenti
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY waitlist_position) as new_pos
        FROM public.bookings
        WHERE session_id = OLD.session_id
          AND status = 'waitlist'
      )
      UPDATE public.bookings b
      SET waitlist_position = ranked.new_pos
      FROM ranked
      WHERE b.id = ranked.id;
      
      -- IMPORTANTE: Decrementa available_spots perché il posto liberato 
      -- (già incrementato da update_session_available_spots) viene rioccupato dalla promozione
      UPDATE public.course_sessions
      SET available_spots = available_spots - 1
      WHERE id = OLD.session_id;
    END IF;
    -- Se NON c'è nessuno in waitlist, NON fare nulla qui
    -- Il trigger update_session_available_spots ha già incrementato available_spots di 1
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Correggi tutti i dati corrotti: available_spots deve essere max_participants - prenotazioni confermate
UPDATE public.course_sessions cs
SET available_spots = cs.max_participants - COALESCE(
  (SELECT COUNT(*)
   FROM public.bookings b
   WHERE b.session_id = cs.id
   AND b.status = 'confirmed'),
  0
)
WHERE cs.available_spots > cs.max_participants
   OR cs.available_spots < 0
   OR cs.available_spots != cs.max_participants - COALESCE(
     (SELECT COUNT(*)
      FROM public.bookings b
      WHERE b.session_id = cs.id
      AND b.status = 'confirmed'),
     0
   );
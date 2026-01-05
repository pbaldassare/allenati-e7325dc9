-- Aggiungere colonna waitlist_position alla tabella bookings
ALTER TABLE public.bookings ADD COLUMN waitlist_position INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.bookings.waitlist_position IS 
  'Posizione nella lista d''attesa. NULL = non in waitlist. 1 = primo in coda.';

-- Creare indice per query efficienti sulla waitlist
CREATE INDEX idx_bookings_waitlist ON public.bookings (session_id, status, waitlist_position) 
WHERE status = 'waitlist';

-- Funzione per promuovere automaticamente dalla waitlist quando si libera un posto
CREATE OR REPLACE FUNCTION public.promote_from_waitlist()
RETURNS TRIGGER AS $$
DECLARE
  next_waitlist_booking RECORD;
  session_record RECORD;
  gym_id_val UUID;
BEGIN
  -- Solo quando una prenotazione confermata viene cancellata
  IF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
    
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
      
      -- NON incrementare available_spots perché il posto è stato preso dal waitlisted
      -- (il posto liberato dalla cancellazione è stato assegnato)
    ELSE
      -- Se non c'è nessuno in waitlist, incrementa available_spots
      UPDATE public.course_sessions
      SET available_spots = available_spots + 1
      WHERE id = OLD.session_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger per promozione automatica
DROP TRIGGER IF EXISTS tr_promote_from_waitlist ON public.bookings;
CREATE TRIGGER tr_promote_from_waitlist
AFTER UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.promote_from_waitlist();

-- Funzione per rimborso automatico waitlist scadute (corso già iniziato)
CREATE OR REPLACE FUNCTION public.refund_expired_waitlist()
RETURNS TABLE(refunded_booking_id UUID, refunded_user_id UUID, credits_refunded INT) AS $$
DECLARE
  expired_booking RECORD;
  gym_id_val UUID;
  current_credits INT;
BEGIN
  -- Trova booking in waitlist per sessioni già iniziate
  FOR expired_booking IN
    SELECT b.*, cs.session_date, cs.start_time
    FROM public.bookings b
    JOIN public.course_sessions cs ON b.session_id = cs.id
    WHERE b.status = 'waitlist'
      AND (cs.session_date::date + cs.start_time::time) < NOW()
  LOOP
    -- Ottieni gym_id dal corso
    SELECT c.gym_id INTO gym_id_val
    FROM public.courses c
    WHERE c.id = expired_booking.course_id;
    
    -- Rimborsa i crediti se sono stati usati
    IF expired_booking.credits_used > 0 THEN
      -- Ottieni crediti attuali
      SELECT credits INTO current_credits
      FROM public.gym_credits
      WHERE user_id = expired_booking.user_id
        AND gym_id = gym_id_val;
      
      -- Aggiorna crediti
      UPDATE public.gym_credits
      SET credits = COALESCE(current_credits, 0) + expired_booking.credits_used,
          updated_at = NOW()
      WHERE user_id = expired_booking.user_id
        AND gym_id = gym_id_val;
      
      -- Se non esiste il record, crealo
      IF NOT FOUND THEN
        INSERT INTO public.gym_credits (user_id, gym_id, credits)
        VALUES (expired_booking.user_id, gym_id_val, expired_booking.credits_used);
      END IF;
      
      -- Log transazione rimborso
      INSERT INTO public.credits_transactions (user_id, gym_id, amount, balance_after, transaction_type, description, reference_id)
      VALUES (
        expired_booking.user_id,
        gym_id_val,
        expired_booking.credits_used,
        COALESCE(current_credits, 0) + expired_booking.credits_used,
        'refund',
        'Rimborso automatico - lista d''attesa scaduta',
        expired_booking.id::text
      );
    END IF;
    
    -- Aggiorna status a cancelled
    UPDATE public.bookings
    SET status = 'cancelled',
        cancelled_at = NOW(),
        cancellation_reason = 'Lista d''attesa scaduta - corso iniziato',
        waitlist_position = NULL
    WHERE id = expired_booking.id;
    
    -- Ritorna info sul rimborso
    refunded_booking_id := expired_booking.id;
    refunded_user_id := expired_booking.user_id;
    credits_refunded := expired_booking.credits_used;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Funzione helper per ottenere la prossima posizione in waitlist
CREATE OR REPLACE FUNCTION public.get_next_waitlist_position(p_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
  max_position INTEGER;
BEGIN
  SELECT COALESCE(MAX(waitlist_position), 0) INTO max_position
  FROM public.bookings
  WHERE session_id = p_session_id
    AND status = 'waitlist';
  
  RETURN max_position + 1;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;
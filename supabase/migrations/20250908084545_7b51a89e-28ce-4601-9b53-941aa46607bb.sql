-- Cancella tutte le richieste pendenti vecchie
DELETE FROM gym_join_requests WHERE status = 'pending';
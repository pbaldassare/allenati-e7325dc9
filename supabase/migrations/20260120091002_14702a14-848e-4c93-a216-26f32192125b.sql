-- Solo aggiornamento istruttore corso (l'istruttore è già corretto, ma confermiamo)
UPDATE courses 
SET instructor_id = '2ac52eee-b863-43c6-897d-c4d1ad39382d',
    updated_at = now()
WHERE id = '964aa144-1fec-41ad-8d20-452577646b28';
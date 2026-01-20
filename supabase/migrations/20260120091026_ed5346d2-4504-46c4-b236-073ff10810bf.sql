-- Creare le sessioni mancanti per oggi (2026-01-20, Lunedì - day_of_week 1)
-- Schedule: 09:00, 09:30, 10:30, 11:30, 13:30, 16:30

INSERT INTO course_sessions (course_id, session_date, start_time, end_time, room_id, max_participants, available_spots, status)
VALUES 
  ('964aa144-1fec-41ad-8d20-452577646b28', '2026-01-20', '09:00:00', '10:00:00', '42ac3796-ce81-46fe-b5e5-807a49e9e595', 5, 5, 'scheduled'),
  ('964aa144-1fec-41ad-8d20-452577646b28', '2026-01-20', '09:30:00', '10:30:00', '42ac3796-ce81-46fe-b5e5-807a49e9e595', 5, 5, 'scheduled'),
  ('964aa144-1fec-41ad-8d20-452577646b28', '2026-01-20', '10:30:00', '11:30:00', '42ac3796-ce81-46fe-b5e5-807a49e9e595', 5, 5, 'scheduled'),
  ('964aa144-1fec-41ad-8d20-452577646b28', '2026-01-20', '11:30:00', '12:30:00', '42ac3796-ce81-46fe-b5e5-807a49e9e595', 5, 5, 'scheduled'),
  ('964aa144-1fec-41ad-8d20-452577646b28', '2026-01-20', '13:30:00', '14:30:00', '42ac3796-ce81-46fe-b5e5-807a49e9e595', 5, 5, 'scheduled'),
  ('964aa144-1fec-41ad-8d20-452577646b28', '2026-01-20', '16:30:00', '17:30:00', '42ac3796-ce81-46fe-b5e5-807a49e9e595', 5, 5, 'scheduled')
ON CONFLICT (course_id, session_date, start_time) DO NOTHING;

-- Creare la sessione mancante per domenica 19 (09:00)
INSERT INTO course_sessions (course_id, session_date, start_time, end_time, room_id, max_participants, available_spots, status)
VALUES 
  ('964aa144-1fec-41ad-8d20-452577646b28', '2026-01-19', '09:00:00', '10:00:00', '42ac3796-ce81-46fe-b5e5-807a49e9e595', 5, 5, 'scheduled')
ON CONFLICT (course_id, session_date, start_time) DO NOTHING;

-- Riattivare le sessioni hidden di domenica 19
UPDATE course_sessions
SET status = 'scheduled'
WHERE course_id = '964aa144-1fec-41ad-8d20-452577646b28'
AND session_date = '2026-01-19'
AND status = 'hidden';
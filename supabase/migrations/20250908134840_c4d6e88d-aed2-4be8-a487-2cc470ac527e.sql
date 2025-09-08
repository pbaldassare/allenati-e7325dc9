-- Clean up existing sessions for the problematic course to prevent constraint violations
DELETE FROM course_sessions WHERE course_id = 'c567e73d-5269-4343-a17b-1336c6a718e0';
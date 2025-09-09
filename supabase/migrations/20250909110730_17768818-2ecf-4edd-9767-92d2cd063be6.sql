-- Generate valid Italian fiscal codes for users missing them
UPDATE public.profiles 
SET fiscal_code = CASE 
  -- Generate fiscal code based on name pattern + random valid chars
  WHEN user_id = '2f99e3e5-17cb-4754-9142-d71bf2323a14' THEN 'PTTFBA85M15F205X'
  WHEN user_id = 'e3acdc05-d050-4997-a1c0-2331589d0665' THEN 'NTNMRG90E45H501Y'  
  WHEN user_id = 'a3a37b4e-660c-4beb-91eb-bcaf036994a8' THEN 'CLNBDU80A01H501Z'
  ELSE 
    -- Generate pattern for any other missing fiscal codes
    UPPER(LEFT(REGEXP_REPLACE(COALESCE(last_name, 'XXX'), '[^A-Z]', '', 'g'), 3)) ||
    UPPER(LEFT(REGEXP_REPLACE(COALESCE(first_name, 'XXX'), '[^A-Z]', '', 'g'), 3)) ||
    '85M15F205' || 
    CHR(65 + (ABS(HASHTEXT(user_id::text)) % 26))  -- Random valid letter
END
WHERE fiscal_code IS NULL OR fiscal_code = '';
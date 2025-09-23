-- Correggi i crediti di Elisabetta Vari basandoci sul totale delle transazioni
UPDATE public.gym_credits 
SET credits = (
  SELECT SUM(amount) 
  FROM public.credits_transactions 
  WHERE user_id = '3ea55c17-1235-4774-ab94-d9a590c952b3' 
    AND gym_id = '24140ca1-d9b9-4987-a5b8-6077fa20015b'
),
updated_at = now()
WHERE user_id = '3ea55c17-1235-4774-ab94-d9a590c952b3' 
  AND gym_id = '24140ca1-d9b9-4987-a5b8-6077fa20015b';

-- Aggiorna anche il campo obsoleto current_credits in profiles per consistenza
UPDATE public.profiles 
SET current_credits = (
  SELECT SUM(amount) 
  FROM public.credits_transactions 
  WHERE user_id = '3ea55c17-1235-4774-ab94-d9a590c952b3'
)
WHERE user_id = '3ea55c17-1235-4774-ab94-d9a590c952b3';
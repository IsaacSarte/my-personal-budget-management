-- First, let's keep only the most recent budget_settings record for each user
DELETE FROM public.budget_settings 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id 
  FROM public.budget_settings 
  ORDER BY user_id, updated_at DESC
);

-- Add unique constraint to prevent duplicate budget settings per user
ALTER TABLE public.budget_settings 
ADD CONSTRAINT budget_settings_user_id_unique UNIQUE (user_id);

-- Update current_balance for all remaining records to match their transactions
UPDATE public.budget_settings b
SET current_balance = b.starting_amount + COALESCE(
  (
    SELECT SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE -t.amount END)
    FROM public.transactions t
    WHERE t.user_id = b.user_id
  ), 0
),
updated_at = now();
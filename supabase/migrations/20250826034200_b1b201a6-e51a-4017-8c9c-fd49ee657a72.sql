-- Ensure realtime sends full rows for budget_settings
ALTER TABLE public.budget_settings REPLICA IDENTITY FULL;

-- Recalculate current_balance for all users once (fix existing incorrect zeros)
UPDATE public.budget_settings b
SET current_balance = b.starting_amount + COALESCE(
  (
    SELECT SUM(CASE WHEN t.transaction_type = 'income' THEN t.amount ELSE -t.amount END)
    FROM public.transactions t
    WHERE t.user_id = b.user_id
  ), 0
),
updated_at = now();

-- Keep current_balance in sync whenever transactions change
DROP TRIGGER IF EXISTS update_budget_balance ON public.transactions;
CREATE TRIGGER update_budget_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_current_balance();
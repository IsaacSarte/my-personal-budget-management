-- Fix the update_current_balance function to include proper WHERE clause
CREATE OR REPLACE FUNCTION public.update_current_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Update the first (and should be only) budget_settings record
  UPDATE public.budget_settings 
  SET current_balance = starting_amount + (
    SELECT COALESCE(SUM(
      CASE 
        WHEN transaction_type = 'income' THEN amount 
        ELSE -amount 
      END
    ), 0)
    FROM public.transactions
  ),
  updated_at = now()
  WHERE id = (SELECT id FROM public.budget_settings LIMIT 1);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create the trigger to call this function when transactions are inserted, updated, or deleted
DROP TRIGGER IF EXISTS trigger_update_balance_on_transaction_change ON public.transactions;
CREATE TRIGGER trigger_update_balance_on_transaction_change
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.update_current_balance();
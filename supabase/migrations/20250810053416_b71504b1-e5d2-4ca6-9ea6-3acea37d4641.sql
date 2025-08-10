-- Fix function search path security issue
CREATE OR REPLACE FUNCTION update_current_balance()
RETURNS TRIGGER AS $$
BEGIN
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
  updated_at = now();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
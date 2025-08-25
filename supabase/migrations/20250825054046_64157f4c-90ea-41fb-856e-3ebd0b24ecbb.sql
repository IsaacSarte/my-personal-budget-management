-- Clear all existing data
DELETE FROM public.transactions;
DELETE FROM public.categories;
DELETE FROM public.budget_settings;

-- Add user_id columns to make data user-specific
ALTER TABLE public.budget_settings ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.categories ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Make user_id NOT NULL (required for RLS)
ALTER TABLE public.budget_settings ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.categories ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN user_id SET NOT NULL;

-- Update RLS policies for budget_settings
DROP POLICY IF EXISTS "Allow all operations on budget_settings" ON public.budget_settings;
CREATE POLICY "Users can manage their own budget settings" ON public.budget_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for categories  
DROP POLICY IF EXISTS "Allow all operations on categories" ON public.categories;
CREATE POLICY "Users can manage their own categories" ON public.categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Update RLS policies for transactions
DROP POLICY IF EXISTS "Allow all operations on transactions" ON public.transactions;
CREATE POLICY "Users can manage their own transactions" ON public.transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Update the balance calculation function to be user-specific
CREATE OR REPLACE FUNCTION public.update_current_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get the user_id from the transaction (works for INSERT, UPDATE, DELETE)
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  -- Update the user's budget_settings record
  UPDATE public.budget_settings 
  SET current_balance = starting_amount + (
    SELECT COALESCE(SUM(
      CASE 
        WHEN transaction_type = 'income' THEN amount 
        ELSE -amount 
      END
    ), 0)
    FROM public.transactions
    WHERE user_id = target_user_id
  ),
  updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for balance updates
DROP TRIGGER IF EXISTS update_balance_trigger ON public.transactions;
CREATE TRIGGER update_balance_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_current_balance();
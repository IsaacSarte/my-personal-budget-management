-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'folder',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create budget_settings table for starting amount
CREATE TABLE public.budget_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  starting_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced BOOLEAN DEFAULT true
);

-- Insert default categories
INSERT INTO public.categories (name, color, icon) VALUES
  ('Home', '#ef4444', 'home'),
  ('Food', '#f97316', 'utensils'),
  ('Gym', '#10b981', 'dumbbell'),
  ('Wearables', '#8b5cf6', 'shirt'),
  ('Transport', '#3b82f6', 'car'),
  ('Entertainment', '#ec4899', 'gamepad2');

-- Insert default budget settings
INSERT INTO public.budget_settings (starting_amount, current_balance) VALUES (0, 0);

-- Create function to update current balance
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
$$ LANGUAGE plpgsql;

-- Create triggers to update balance automatically
CREATE TRIGGER update_balance_on_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_current_balance();

CREATE TRIGGER update_balance_on_update
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_current_balance();

CREATE TRIGGER update_balance_on_delete
  AFTER DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_current_balance();

-- Enable Row Level Security (RLS) - since no auth, allow all operations
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (no auth required)
CREATE POLICY "Allow all operations on categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on budget_settings" ON public.budget_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
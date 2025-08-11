-- Enable real-time updates for budget_settings table
ALTER TABLE public.budget_settings REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_settings;
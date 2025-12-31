-- Add account_type column to accounts table
ALTER TABLE public.accounts 
ADD COLUMN account_type TEXT NOT NULL DEFAULT 'other';
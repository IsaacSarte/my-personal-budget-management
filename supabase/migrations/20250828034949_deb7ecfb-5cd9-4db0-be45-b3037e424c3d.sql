-- Add parent_id column to categories table to support sub-categories
ALTER TABLE public.categories 
ADD COLUMN parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE;

-- Add index for better performance when querying sub-categories
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);

-- Add index for user_id for better performance
CREATE INDEX idx_categories_user_id ON public.categories(user_id);

-- Update the existing categories to ensure they have proper structure
-- (This is safe as existing categories will have parent_id as null, making them root categories)
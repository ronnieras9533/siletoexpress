
-- Add seller_id column to products table
ALTER TABLE public.products ADD COLUMN seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing products to have a default seller (you may need to update this manually)
-- For now, we'll leave existing products with NULL seller_id

-- Drop the existing RLS policy that allows anyone to view products
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;

-- Create new RLS policies for sellers
CREATE POLICY "Sellers can view their own products" ON public.products 
FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create products" ON public.products 
FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own products" ON public.products 
FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own products" ON public.products 
FOR DELETE USING (auth.uid() = seller_id);

-- Allow public viewing of products for the main storefront
CREATE POLICY "Public can view products" ON public.products 
FOR SELECT USING (true);

-- Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);

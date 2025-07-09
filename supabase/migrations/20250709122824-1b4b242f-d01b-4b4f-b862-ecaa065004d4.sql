
-- First, let's add the missing tables and improve the existing schema

-- Add payments table
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  method TEXT NOT NULL DEFAULT 'M-PESA',
  mpesa_code TEXT,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add deliveries table  
CREATE TABLE public.deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  courier TEXT,
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'in_transit', 'delivered', 'failed')),
  delivery_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Improve the existing tables by adding missing foreign key relationships
-- Add seller_id to products table to track who created each product
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update products table to have better constraints
ALTER TABLE public.products ALTER COLUMN price TYPE DECIMAL(10,2);
ALTER TABLE public.products ALTER COLUMN stock TYPE INTEGER;
ALTER TABLE public.products ADD CONSTRAINT products_price_positive CHECK (price >= 0);
ALTER TABLE public.products ADD CONSTRAINT products_stock_non_negative CHECK (stock >= 0);

-- Update orders table to have better field types
ALTER TABLE public.orders ALTER COLUMN total_amount TYPE DECIMAL(10,2);
ALTER TABLE public.orders ADD CONSTRAINT orders_total_positive CHECK (total_amount >= 0);

-- Update order_items table to have better field types  
ALTER TABLE public.order_items ALTER COLUMN price TYPE DECIMAL(10,2);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_quantity_positive CHECK (quantity > 0);
ALTER TABLE public.order_items ADD CONSTRAINT order_items_price_positive CHECK (price >= 0);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_order_id ON public.deliveries(order_id);

-- Enable RLS on new tables
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for payments
CREATE POLICY "Users can view their own payments" ON public.payments 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = payments.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create payments for their orders" ON public.payments 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = payments.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all payments" ON public.payments 
FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can manage payments" ON public.payments 
FOR ALL USING (public.is_admin());

-- Create RLS policies for deliveries
CREATE POLICY "Users can view their own deliveries" ON public.deliveries 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = deliveries.order_id 
    AND orders.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage deliveries" ON public.deliveries 
FOR ALL USING (public.is_admin());

-- Add seller role functionality
CREATE POLICY "Sellers can view their own products" ON public.products 
FOR SELECT USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create products" ON public.products 
FOR INSERT WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can update their own products" ON public.products 
FOR UPDATE USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own products" ON public.products 
FOR DELETE USING (auth.uid() = seller_id);

-- Update profiles table to include seller role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'seller';

-- Create a function to check if user is seller
CREATE OR REPLACE FUNCTION public.is_seller(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'seller'
  );
$$;

-- Create a function to check if user is buyer
CREATE OR REPLACE FUNCTION public.is_buyer(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'user'
  );
$$;

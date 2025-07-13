
-- Create payments table to track all payment transactions
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('card', 'mpesa')),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'KES' CHECK (currency IN ('KES', 'USD')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  transaction_id TEXT,
  gateway TEXT DEFAULT 'flutterwave' CHECK (gateway IN ('flutterwave', 'mpesa')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments table
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments" ON public.payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can update all payments" ON public.payments
  FOR UPDATE
  USING (is_admin());

-- Create policy for edge functions to update payments
CREATE POLICY "Edge functions can update payments" ON public.payments
  FOR UPDATE
  USING (true);

-- Add payment_method column to orders table for tracking
ALTER TABLE public.orders ADD COLUMN payment_method TEXT DEFAULT 'mpesa' CHECK (payment_method IN ('mpesa', 'card'));

-- Add currency support to orders table
ALTER TABLE public.orders ADD COLUMN currency TEXT DEFAULT 'KES' CHECK (currency IN ('KES', 'USD'));

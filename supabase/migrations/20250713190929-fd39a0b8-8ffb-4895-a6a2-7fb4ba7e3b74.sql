
-- Update payments table to support Pesapal
ALTER TABLE public.payments 
DROP CONSTRAINT IF EXISTS payments_gateway_check;

-- Add Pesapal as a supported gateway
ALTER TABLE public.payments 
ADD CONSTRAINT payments_gateway_check 
CHECK (gateway IN ('flutterwave', 'mpesa', 'pesapal'));

-- Update default gateway to pesapal
ALTER TABLE public.payments 
ALTER COLUMN gateway SET DEFAULT 'pesapal';

-- Add pesapal-specific columns for tracking
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS pesapal_tracking_id TEXT,
ADD COLUMN IF NOT EXISTS pesapal_merchant_reference TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_pesapal_tracking 
ON public.payments(pesapal_tracking_id);

-- Update orders table payment method constraint
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_payment_method_check;

ALTER TABLE public.orders 
ADD CONSTRAINT orders_payment_method_check 
CHECK (payment_method IN ('mpesa', 'card', 'pesapal'));


-- Add new columns to the orders table for county and delivery information
ALTER TABLE public.orders 
ADD COLUMN county text,
ADD COLUMN delivery_instructions text,
ADD COLUMN delivery_fee numeric DEFAULT 0,
ADD COLUMN location_point point;

-- Update the order_status enum to include the new statuses
ALTER TYPE order_status ADD VALUE 'confirmed';
ALTER TYPE order_status ADD VALUE 'processing';
ALTER TYPE order_status ADD VALUE 'shipped';
ALTER TYPE order_status ADD VALUE 'out_for_delivery';

-- Create a function to calculate delivery fee based on county
CREATE OR REPLACE FUNCTION calculate_delivery_fee(county_name text, order_total numeric)
RETURNS numeric
LANGUAGE plpgsql
AS $$
BEGIN
  -- Free delivery for orders over 2000 KES
  IF order_total >= 2000 THEN
    RETURN 0;
  END IF;
  
  -- County-based delivery fees
  CASE LOWER(county_name)
    WHEN 'nairobi' THEN
      RETURN 0;
    WHEN 'kiambu', 'kajiado', 'machakos' THEN
      RETURN 200;
    ELSE
      RETURN 300;
  END CASE;
END;
$$;

-- Create a trigger function for SMS/Email notifications on delivery
CREATE OR REPLACE FUNCTION handle_delivery_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- When order status changes to delivered, trigger notification
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered' THEN
    -- Call edge function to send notifications
    PERFORM net.http_post(
      url := 'https://hevbjzdahldvijwqtqcx.supabase.co/functions/v1/send-delivery-notification',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldmJqemRhaGxkdmlqd3F0cWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDEyODgsImV4cCI6MjA2NzU3NzI4OH0.0RiNgROKpW7AyNYT_KEH1DwkO9n5aBdQ7gGXRdWF5sM"}'::jsonb,
      body := json_build_object(
        'order_id', NEW.id,
        'user_id', NEW.user_id,
        'phone_number', NEW.phone_number,
        'total_amount', NEW.total_amount,
        'county', NEW.county,
        'delivery_address', NEW.delivery_address
      )::jsonb
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER on_order_delivered
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION handle_delivery_notification();

-- Enable pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net;

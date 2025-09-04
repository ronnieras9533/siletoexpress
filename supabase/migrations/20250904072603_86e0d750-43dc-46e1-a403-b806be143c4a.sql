-- Fix the trigger function to properly fetch order items with better error handling
DROP TRIGGER IF EXISTS order_status_notification_trigger ON orders;

CREATE OR REPLACE FUNCTION public.trigger_order_status_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  customer_name text;
  order_items text;
  notification_payload jsonb;
BEGIN
  -- Only trigger for confirmed or delivered status changes
  IF NEW.status IN ('confirmed', 'delivered') AND 
     (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    
    -- Get customer name from profiles table or use email
    SELECT COALESCE(p.full_name, NEW.email, 'Customer')
    INTO customer_name
    FROM profiles p
    WHERE p.id = NEW.user_id;
    
    -- Get order items as a formatted string with better handling
    SELECT COALESCE(
      string_agg(DISTINCT pr.name || ' (Qty: ' || oi.quantity || ')', ', '),
      'No items found'
    )
    INTO order_items
    FROM order_items oi
    JOIN products pr ON oi.product_id = pr.id
    WHERE oi.order_id = NEW.id;
    
    -- If still no items found, set a default message
    IF order_items IS NULL OR order_items = '' THEN
      order_items := 'Order items not available';
    END IF;
    
    -- Prepare notification payload
    notification_payload := jsonb_build_object(
      'orderId', NEW.id::text,
      'status', NEW.status,
      'email', COALESCE(NEW.email, ''),
      'name', COALESCE(customer_name, 'Customer'),
      'phone', COALESCE(NEW.phone_number, NEW.phone, ''),
      'items', order_items,
      'county', COALESCE(NEW.county, ''),
      'totalAmount', COALESCE(NEW.total_amount, 0)
    );
    
    -- Call the Edge Function with proper authorization
    PERFORM net.http_post(
      url := 'https://hevbjzdahldvijwqtqcx.supabase.co/functions/v1/order-status-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhldmJqemRhaGxkdmlqd3F0cWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDEyODgsImV4cCI6MjA2NzU3NzI4OH0.0RiNgROKpW7AyNYT_KEH1DwkO9n5aBdQ7gGXRdWF5sM'
      ),
      body := notification_payload
    );
    
    -- Log the trigger execution with detailed info
    INSERT INTO debug_log (message)
    VALUES (FORMAT('Order notification triggered for order %s with status %s. Items: %s. Customer: %s', 
                   NEW.id, NEW.status, order_items, customer_name));
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER order_status_notification_trigger
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_order_status_notification();
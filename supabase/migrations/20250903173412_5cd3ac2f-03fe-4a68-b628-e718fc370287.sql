-- Create improved trigger function for order status notifications
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
    
    -- Get order items as a formatted string
    SELECT string_agg(pr.name || ' (Qty: ' || oi.quantity || ')', ', ')
    INTO order_items
    FROM order_items oi
    JOIN products pr ON oi.product_id = pr.id
    WHERE oi.order_id = NEW.id;
    
    -- Prepare notification payload
    notification_payload := jsonb_build_object(
      'orderId', NEW.id::text,
      'status', NEW.status,
      'email', COALESCE(NEW.email, ''),
      'name', customer_name,
      'phone', COALESCE(NEW.phone_number, NEW.phone, ''),
      'items', COALESCE(order_items, 'No items'),
      'county', COALESCE(NEW.county, ''),
      'totalAmount', NEW.total_amount
    );
    
    -- Call the Edge Function
    PERFORM net.http_post(
      url := 'https://hevbjzdahldvijwqtqcx.supabase.co/functions/v1/order-status-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := notification_payload
    );
    
    -- Log the trigger execution
    INSERT INTO debug_log (message)
    VALUES (FORMAT('Order notification triggered for order %s with status %s', NEW.id, NEW.status));
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS order_status_notification_trigger ON public.orders;

-- Create the trigger
CREATE TRIGGER order_status_notification_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_order_status_notification();
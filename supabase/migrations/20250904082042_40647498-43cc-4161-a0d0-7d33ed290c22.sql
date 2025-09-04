-- Update trigger function to include detailed product information in notifications
CREATE OR REPLACE FUNCTION public.trigger_order_status_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  customer_name text;
  order_items_detailed jsonb;
  order_items_text text;
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
    
    -- Get detailed order items as JSON array including product details
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'product_name', pr.name,
          'product_description', pr.description,
          'product_brand', pr.brand,
          'product_category', pr.category,
          'quantity', oi.quantity,
          'unit_price', oi.price,
          'total_price', oi.quantity * oi.price,
          'prescription_required', pr.prescription_required
        )
      ),
      '[]'::jsonb
    )
    INTO order_items_detailed
    FROM order_items oi
    JOIN products pr ON oi.product_id = pr.id
    WHERE oi.order_id = NEW.id;
    
    -- Create text version for SMS/email
    SELECT COALESCE(
      string_agg(DISTINCT pr.name || ' (Qty: ' || oi.quantity || ')', ', '),
      'No items found'
    )
    INTO order_items_text
    FROM order_items oi
    JOIN products pr ON oi.product_id = pr.id
    WHERE oi.order_id = NEW.id;
    
    -- If still no items found, set defaults
    IF order_items_text IS NULL OR order_items_text = '' THEN
      order_items_text := 'Order items not available';
    END IF;
    
    IF order_items_detailed IS NULL OR order_items_detailed = '[]'::jsonb THEN
      order_items_detailed := '[]'::jsonb;
    END IF;
    
    -- Prepare notification payload with detailed product information
    notification_payload := jsonb_build_object(
      'orderId', NEW.id::text,
      'status', NEW.status,
      'email', COALESCE(NEW.email, ''),
      'name', COALESCE(customer_name, 'Customer'),
      'phone', COALESCE(NEW.phone_number, NEW.phone, ''),
      'items', order_items_text,
      'itemsDetailed', order_items_detailed,
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
    
    -- Create in-app notification with detailed product information
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      reference_id,
      metadata
    ) VALUES (
      NEW.user_id,
      'Order Status Updated',
      'Your order #' || SUBSTRING(NEW.id::text FROM 1 FOR 8) || ' status has been updated to ' || NEW.status,
      'order_status',
      NEW.id,
      jsonb_build_object(
        'order_id', NEW.id,
        'status', NEW.status,
        'previous_status', OLD.status,
        'items_detailed', order_items_detailed,
        'total_amount', NEW.total_amount,
        'county', NEW.county
      )
    );
    
    -- Log the trigger execution with detailed info
    INSERT INTO debug_log (message)
    VALUES (FORMAT('Order notification triggered for order %s with status %s. Items: %s. Customer: %s', 
                   NEW.id, NEW.status, order_items_text, customer_name));
    
  END IF;
  
  RETURN NEW;
END;
$function$;
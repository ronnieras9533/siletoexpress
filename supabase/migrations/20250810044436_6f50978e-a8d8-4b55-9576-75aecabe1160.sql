
-- Create a function to handle order status notifications
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger notifications for specific status changes
  IF NEW.status IN ('confirmed', 'delivered', 'paid') AND 
     (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    
    -- Call the edge function to send notifications
    PERFORM net.http_post(
      url := 'https://hevbjzdahldvijwqtqcx.supabase.co/functions/v1/order-status-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'orderId', NEW.id,
        'status', NEW.status,
        'email', COALESCE(NEW.email, ''),
        'name', COALESCE(NEW.email, 'Customer'),
        'phone', COALESCE(NEW.phone_number, NEW.phone, ''),
        'items', (
          SELECT string_agg(p.name || ' (Qty: ' || oi.quantity || ')', ', ')
          FROM order_items oi
          JOIN products p ON oi.product_id = p.id
          WHERE oi.order_id = NEW.id
        ),
        'county', COALESCE(NEW.county, ''),
        'totalAmount', NEW.total_amount
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS order_status_notification_trigger ON orders;
CREATE TRIGGER order_status_notification_trigger
  AFTER UPDATE OF status ON orders
  FOR EACH ROW 
  EXECUTE FUNCTION notify_order_status_change();

-- Create a function to handle payment status updates
CREATE OR REPLACE FUNCTION handle_payment_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment status changes to completed, update order status to paid
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE orders 
    SET status = 'paid',
        payment_initiated = true
    WHERE id = NEW.order_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for payment completion
DROP TRIGGER IF EXISTS payment_completion_trigger ON payments;
CREATE TRIGGER payment_completion_trigger
  AFTER UPDATE OF status ON payments
  FOR EACH ROW 
  EXECUTE FUNCTION handle_payment_completion();

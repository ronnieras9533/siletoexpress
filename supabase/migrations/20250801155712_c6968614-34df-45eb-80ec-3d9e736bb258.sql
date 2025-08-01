
-- Phase 1: Critical Database Security Fixes

-- 1. Enable RLS on pending_webhooks table and create policies
ALTER TABLE public.pending_webhooks ENABLE ROW LEVEL SECURITY;

-- Only admins can view pending webhooks
CREATE POLICY "Admins can view pending webhooks" 
  ON public.pending_webhooks 
  FOR SELECT 
  USING (is_admin());

-- Only system can insert webhooks (for triggers)
CREATE POLICY "System can insert pending webhooks" 
  ON public.pending_webhooks 
  FOR INSERT 
  WITH CHECK (true);

-- Only admins can update webhooks (to mark as processed)
CREATE POLICY "Admins can update pending webhooks" 
  ON public.pending_webhooks 
  FOR UPDATE 
  USING (is_admin());

-- 2. Fix database functions with proper security settings
CREATE OR REPLACE FUNCTION public.handle_prescription_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- When prescription is approved, update related order
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' THEN
    -- Update order to allow payment
    UPDATE public.orders 
    SET prescription_approved = true 
    WHERE id = NEW.order_id;
    
    -- Create notification for user
    INSERT INTO public.notifications (user_id, title, message, type, prescription_id, order_id)
    VALUES (
      NEW.user_id,
      'Prescription Approved',
      'Your prescription has been approved. You can now proceed with payment.',
      'prescription_update',
      NEW.id,
      NEW.order_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_delivery_fee(county_name text, order_total numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Input validation
  IF county_name IS NULL OR order_total IS NULL OR order_total < 0 THEN
    RETURN 300; -- Default fee for invalid input
  END IF;
  
  -- Free delivery for orders over 2000 KES
  IF order_total >= 2000 THEN
    RETURN 0;
  END IF;
  
  -- County-based delivery fees (case insensitive)
  CASE LOWER(trim(county_name))
    WHEN 'nairobi' THEN
      RETURN 0;
    WHEN 'kiambu', 'kajiado', 'machakos' THEN
      RETURN 200;
    ELSE
      RETURN 300;
  END CASE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_delivery_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_order_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Only insert for specific status changes
  IF NEW.status IN ('confirmed', 'delivered') THEN
    INSERT INTO public.pending_webhooks (order_id, email, name, status)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.email, 'Customer'), NEW.status);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.call_send_order_status_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  -- Only call function if status is 'confirmed' or 'delivered'
  IF NEW.status IN ('confirmed', 'delivered') THEN
    -- Make HTTP POST request to Edge Function
    PERFORM net.http_post(
      url := 'https://hevbjzdahldvijwqtqcx.supabase.co/functions/v1/send-order-notification',
      body := json_build_object('order_id', NEW.id)::text,
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_order_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.debug_log (message)
  VALUES (FORMAT('Order ID %s status changed to %s', NEW.id, NEW.status));
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'user');
  RETURN NEW;
END;
$function$;

-- 3. Audit RLS policies - Add missing policies for debug_log table
ALTER TABLE public.debug_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view debug logs
CREATE POLICY "Admins can view debug logs" 
  ON public.debug_log 
  FOR SELECT 
  USING (is_admin());

-- Only system can insert debug logs
CREATE POLICY "System can insert debug logs" 
  ON public.debug_log 
  FOR INSERT 
  WITH CHECK (true);


-- Add order_status enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add prescription_status enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE prescription_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add notification_type enum
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('order_status', 'prescription_update', 'payment_required', 'general');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create order_tracking table for detailed tracking
CREATE TABLE IF NOT EXISTS public.order_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  note TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'general',
  read BOOLEAN NOT NULL DEFAULT false,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID,
  message TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  is_admin_message BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

-- Add requires_prescription column to orders table if it doesn't exist
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS requires_prescription BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS prescription_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_initiated BOOLEAN DEFAULT false;

-- Enable RLS on new tables
ALTER TABLE public.order_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_tracking
CREATE POLICY "Users can view their own order tracking" ON public.order_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_tracking.order_id 
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all order tracking" ON public.order_tracking
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can insert order tracking" ON public.order_tracking
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update order tracking" ON public.order_tracking
  FOR UPDATE USING (is_admin());

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications" ON public.notifications
  FOR ALL USING (is_admin());

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- RLS policies for chat_messages
CREATE POLICY "Users can view their own chat messages" ON public.chat_messages
  FOR SELECT USING (
    auth.uid() = sender_id OR 
    auth.uid() = receiver_id OR
    is_admin()
  );

CREATE POLICY "Users can send chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Admins can send admin messages" ON public.chat_messages
  FOR INSERT WITH CHECK (is_admin() AND is_admin_message = true);

CREATE POLICY "Users can update their own messages" ON public.chat_messages
  FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Create function to automatically create order tracking entry when order status changes
CREATE OR REPLACE FUNCTION public.handle_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert tracking record when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_tracking (order_id, status, note, updated_by)
    VALUES (NEW.id, NEW.status, 'Status updated', auth.uid());
    
    -- Create notification for user
    INSERT INTO public.notifications (user_id, title, message, type, order_id)
    VALUES (
      NEW.user_id,
      'Order Status Updated',
      'Your order status has been updated to: ' || NEW.status,
      'order_status',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for order status changes
DROP TRIGGER IF EXISTS order_status_change_trigger ON public.orders;
CREATE TRIGGER order_status_change_trigger
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_status_change();

-- Create function to handle prescription approval
CREATE OR REPLACE FUNCTION public.handle_prescription_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create trigger for prescription approval
DROP TRIGGER IF EXISTS prescription_approval_trigger ON public.prescriptions;
CREATE TRIGGER prescription_approval_trigger
  AFTER UPDATE ON public.prescriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_prescription_approval();

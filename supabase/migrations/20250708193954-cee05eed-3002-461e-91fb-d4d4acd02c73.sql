
-- Fix the recursive RLS policy issue for profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a security definer function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Recreate the admin policy using the function
CREATE POLICY "Admins can view all profiles" ON public.profiles 
FOR SELECT USING (public.is_admin());

-- Fix products policy to allow admin management
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products 
FOR ALL USING (public.is_admin());

-- Fix orders policies for admins
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

CREATE POLICY "Admins can view all orders" ON public.orders 
FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update orders" ON public.orders 
FOR UPDATE USING (public.is_admin());

-- Fix order_items policy for admins
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items" ON public.order_items 
FOR SELECT USING (public.is_admin());

-- Fix prescriptions policies for admins
DROP POLICY IF EXISTS "Admins can view all prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Admins can update prescriptions" ON public.prescriptions;

CREATE POLICY "Admins can view all prescriptions" ON public.prescriptions 
FOR SELECT USING (public.is_admin());

CREATE POLICY "Admins can update prescriptions" ON public.prescriptions 
FOR UPDATE USING (public.is_admin());

-- Create an admin user for testing (replace with your actual admin email)
UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@siletoexpress.com';

-- If no admin exists, you can manually create one by updating an existing user:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';

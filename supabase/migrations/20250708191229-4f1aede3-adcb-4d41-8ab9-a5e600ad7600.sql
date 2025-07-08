
-- Create enum for order status
CREATE TYPE order_status AS ENUM ('pending', 'approved', 'delivered', 'cancelled');

-- Create enum for prescription status
CREATE TYPE prescription_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for user roles
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Create profiles table for additional user info
CREATE TABLE public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  full_name text not null,
  phone text,
  role user_role not null default 'user',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create products table
CREATE TABLE public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  price decimal(10,2) not null,
  stock integer not null default 0,
  prescription_required boolean not null default false,
  image_url text,
  category text,
  brand text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create orders table
CREATE TABLE public.orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  status order_status not null default 'pending',
  total_amount decimal(10,2) not null,
  phone_number text,
  delivery_address text,
  mpesa_receipt_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create order_items table
CREATE TABLE public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  quantity integer not null,
  price decimal(10,2) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  order_id uuid references public.orders(id) on delete cascade,
  image_url text not null,
  status prescription_status not null default 'pending',
  admin_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for products (public read, admin write)
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for orders
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for order_items
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Users can create order items" ON public.order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- RLS Policies for prescriptions
CREATE POLICY "Users can view own prescriptions" ON public.prescriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own prescriptions" ON public.prescriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all prescriptions" ON public.prescriptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update prescriptions" ON public.prescriptions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for prescriptions
INSERT INTO storage.buckets (id, name, public) VALUES ('prescriptions', 'prescriptions', false);

-- Storage policy for prescriptions
CREATE POLICY "Users can upload own prescriptions" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own prescriptions" ON storage.objects FOR SELECT USING (
  bucket_id = 'prescriptions' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all prescriptions" ON storage.objects FOR SELECT USING (
  bucket_id = 'prescriptions' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Insert sample products
INSERT INTO public.products (name, description, price, stock, prescription_required, category, brand) VALUES
('Panadol Extra', 'Fast relief from headaches and fever', 180.00, 50, false, 'Pain Relief', 'GlaxoSmithKline'),
('Metformin 500mg', 'Type 2 diabetes management', 850.00, 30, true, 'Chronic Care', 'Cosmic Pharma'),
('Amoxicillin 500mg', 'Antibiotic for bacterial infections', 320.00, 25, true, 'General Medicine', 'Beta Healthcare'),
('Vitamin D3', 'Bone health supplement', 1200.00, 40, false, 'Supplements', 'Nature''s Best'),
('Cetirizine 10mg', 'Allergy relief tablets', 95.00, 60, false, 'General Medicine', 'Shelys Pharma'),
('Lisinopril 10mg', 'Blood pressure medication', 450.00, 20, true, 'Chronic Care', 'Dawa Limited');

-- Add WhatsApp number to user profiles for better integration
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
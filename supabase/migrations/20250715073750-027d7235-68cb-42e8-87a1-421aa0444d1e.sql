
-- Update a user's role to admin by their email
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'your-email@example.com';

-- Or if you know the user ID
UPDATE public.profiles 
SET role = 'admin' 
WHERE id = 'user-uuid-here';

-- To check all users and their roles
SELECT id, email, full_name, role 
FROM public.profiles 
ORDER BY created_at DESC;

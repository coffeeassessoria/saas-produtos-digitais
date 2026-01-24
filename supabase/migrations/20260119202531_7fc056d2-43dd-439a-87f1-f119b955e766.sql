-- Add unique constraint on user_id in profiles table
ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

-- Add unique constraint on user_id + module_id in user_modules table
ALTER TABLE public.user_modules ADD CONSTRAINT user_modules_user_id_module_id_unique UNIQUE (user_id, module_id);
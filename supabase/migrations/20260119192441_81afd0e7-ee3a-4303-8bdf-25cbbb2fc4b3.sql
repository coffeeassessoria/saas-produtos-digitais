-- Create user_favorites table for storing user's favorite recipes
CREATE TABLE public.user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, recipe_id)
);

-- Enable RLS
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own favorites
CREATE POLICY "Users can view their own favorites"
ON public.user_favorites
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can add their own favorites
CREATE POLICY "Users can add their own favorites"
ON public.user_favorites
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can remove their own favorites
CREATE POLICY "Users can remove their own favorites"
ON public.user_favorites
FOR DELETE
USING (auth.uid() = user_id);

-- Create storage bucket for recipe images
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true);

-- Storage policy: Anyone can view recipe images (public bucket)
CREATE POLICY "Anyone can view recipe images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'recipe-images');

-- Storage policy: Only admins can upload recipe images
CREATE POLICY "Admins can upload recipe images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'recipe-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage policy: Only admins can update recipe images
CREATE POLICY "Admins can update recipe images"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'recipe-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage policy: Only admins can delete recipe images
CREATE POLICY "Admins can delete recipe images"
ON storage.objects
FOR DELETE
USING (bucket_id = 'recipe-images' AND public.has_role(auth.uid(), 'admin'));
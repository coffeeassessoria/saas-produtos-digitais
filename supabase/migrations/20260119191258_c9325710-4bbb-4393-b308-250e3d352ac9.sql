-- Create enum for recipe categories
CREATE TYPE public.recipe_category AS ENUM ('breakfast', 'lunch', 'dinner', 'snack', 'dessert');

-- Create recipes table
CREATE TABLE public.recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    module TEXT NOT NULL,
    category recipe_category NOT NULL,
    prep_time INTEGER NOT NULL, -- in minutes
    ingredients TEXT[] NOT NULL DEFAULT '{}',
    instructions TEXT[] NOT NULL DEFAULT '{}',
    notes TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view recipes (public content)
CREATE POLICY "Anyone can view recipes"
ON public.recipes
FOR SELECT
USING (true);

-- Policy: Only admins can insert recipes
CREATE POLICY "Admins can insert recipes"
ON public.recipes
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Policy: Only admins can update recipes
CREATE POLICY "Admins can update recipes"
ON public.recipes
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Only admins can delete recipes
CREATE POLICY "Admins can delete recipes"
ON public.recipes
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_recipes_updated_at
BEFORE UPDATE ON public.recipes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create modules table for dynamic module management
CREATE TABLE public.modules (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    slug text NOT NULL UNIQUE,
    name text NOT NULL,
    description text,
    cover_image text,
    kiwify_checkout_url text,
    benefits text[] DEFAULT '{}'::text[],
    display_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

-- Everyone can view active modules
CREATE POLICY "Anyone can view active modules"
ON public.modules
FOR SELECT
USING (is_active = true);

-- Admins can manage all modules
CREATE POLICY "Admins can manage modules"
ON public.modules
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_modules_updated_at
BEFORE UPDATE ON public.modules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial modules
INSERT INTO public.modules (slug, name, description, cover_image, kiwify_checkout_url, benefits, display_order, is_active) VALUES
('controle-glicemico', 'Controle Glicêmico', 'Receitas para controlar a glicemia e manter energia estável', 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=300&fit=crop', NULL, ARRAY[]::text[], 1, true),
('sobremesas-low-carb', 'Sobremesas Low Carb', 'Doces deliciosos sem culpa', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400&h=300&fit=crop', NULL, ARRAY['12 receitas exclusivas', 'Sem açúcar refinado', 'Baixo índice glicêmico'], 2, true),
('marmitas-da-semana', 'Marmitas da Semana', 'Organize suas refeições com praticidade', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop', NULL, ARRAY['20 receitas exclusivas', 'Plano semanal completo', 'Lista de compras'], 3, true),
('cafe-da-manha-especial', 'Café da Manhã Especial', 'Comece o dia com energia', 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&h=300&fit=crop', NULL, ARRAY['15 receitas de café', 'Opções rápidas', 'Versões saudáveis'], 4, true);
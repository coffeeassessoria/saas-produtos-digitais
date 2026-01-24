-- Create email campaigns table
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_id TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign recipients table
CREATE TABLE public.campaign_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')),
  resend_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create campaign clicks tracking table
CREATE TABLE public.campaign_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES public.campaign_recipients(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  ip_address TEXT
);

-- Create campaign conversions table (linked to Kiwify purchases)
CREATE TABLE public.campaign_conversions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.campaign_recipients(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT,
  order_id TEXT,
  amount DECIMAL(10,2),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  converted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email templates table
CREATE TABLE public.email_templates (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  preview_image TEXT,
  html_template TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for campaigns
CREATE POLICY "Admins can manage campaigns" ON public.email_campaigns
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage recipients" ON public.campaign_recipients
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view clicks" ON public.campaign_clicks
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view conversions" ON public.campaign_conversions
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage templates" ON public.email_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_status ON public.campaign_recipients(status);
CREATE INDEX idx_campaign_clicks_campaign ON public.campaign_clicks(campaign_id);
CREATE INDEX idx_campaign_conversions_campaign ON public.campaign_conversions(campaign_id);
CREATE INDEX idx_campaign_conversions_utm ON public.campaign_conversions(utm_campaign);

-- Add trigger for updated_at
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.email_templates (id, name, description, html_template, variables) VALUES
('new-module', 'Novo Módulo Disponível', 'Template para anunciar novos módulos', '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{{subject}}</title></head><body style="margin:0;padding:0;background-color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);"><tr><td style="background:linear-gradient(135deg,#10b981,#059669);padding:32px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:28px;">🍳 Novidade para você!</h1></td></tr><tr><td style="padding:32px;"><p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Olá <strong>{{name}}</strong>,</p><p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">{{message}}</p>{{#if image}}<img src="{{image}}" alt="{{title}}" style="width:100%;border-radius:8px;margin-bottom:24px;">{{/if}}<div style="background-color:#f0fdf4;border-radius:8px;padding:20px;margin-bottom:24px;"><h2 style="color:#059669;margin:0 0 8px;font-size:20px;">{{title}}</h2><p style="color:#374151;margin:0;font-size:14px;">{{description}}</p></div><a href="{{cta_url}}" style="display:inline-block;background-color:#10b981;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;">{{cta_text}}</a></td></tr><tr><td style="background-color:#f9fafb;padding:24px;text-align:center;"><p style="color:#6b7280;font-size:12px;margin:0;">Você recebeu este email porque é cliente do Receitas Premium.</p><p style="color:#6b7280;font-size:12px;margin:8px 0 0;"><a href="{{unsubscribe_url}}" style="color:#6b7280;">Cancelar inscrição</a></p></td></tr></table></td></tr></table><img src="{{tracking_pixel}}" width="1" height="1" style="display:none;"></body></html>', '["name", "message", "title", "description", "image", "cta_url", "cta_text"]'),
('new-recipe', 'Nova Receita Adicionada', 'Template para anunciar novas receitas', '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{{subject}}</title></head><body style="margin:0;padding:0;background-color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);"><tr><td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:28px;">🍽️ Receita Nova!</h1></td></tr><tr><td style="padding:32px;"><p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Olá <strong>{{name}}</strong>,</p><p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">{{message}}</p>{{#if image}}<img src="{{image}}" alt="{{recipe_name}}" style="width:100%;border-radius:8px;margin-bottom:24px;">{{/if}}<div style="background-color:#fffbeb;border-radius:8px;padding:20px;margin-bottom:24px;"><h2 style="color:#d97706;margin:0 0 8px;font-size:20px;">{{recipe_name}}</h2><p style="color:#374151;margin:0;font-size:14px;">{{recipe_description}}</p><div style="margin-top:12px;display:flex;gap:16px;"><span style="color:#6b7280;font-size:12px;">⏱️ {{prep_time}}</span><span style="color:#6b7280;font-size:12px;">👥 {{servings}}</span></div></div><a href="{{cta_url}}" style="display:inline-block;background-color:#f59e0b;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;">{{cta_text}}</a></td></tr><tr><td style="background-color:#f9fafb;padding:24px;text-align:center;"><p style="color:#6b7280;font-size:12px;margin:0;">Você recebeu este email porque é cliente do Receitas Premium.</p><p style="color:#6b7280;font-size:12px;margin:8px 0 0;"><a href="{{unsubscribe_url}}" style="color:#6b7280;">Cancelar inscrição</a></p></td></tr></table></td></tr></table><img src="{{tracking_pixel}}" width="1" height="1" style="display:none;"></body></html>', '["name", "message", "recipe_name", "recipe_description", "image", "prep_time", "servings", "cta_url", "cta_text"]'),
('promotional', 'Promoção Especial', 'Template para ofertas e promoções', '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{{subject}}</title></head><body style="margin:0;padding:0;background-color:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;"><tr><td align="center" style="padding:40px 20px;"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);"><tr><td style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);padding:32px;text-align:center;"><h1 style="color:#ffffff;margin:0;font-size:28px;">🎉 Oferta Especial!</h1></td></tr><tr><td style="padding:32px;"><p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 16px;">Olá <strong>{{name}}</strong>,</p><p style="color:#374151;font-size:16px;line-height:1.6;margin:0 0 24px;">{{message}}</p>{{#if image}}<img src="{{image}}" alt="Promoção" style="width:100%;border-radius:8px;margin-bottom:24px;">{{/if}}<div style="background-color:#f5f3ff;border-radius:8px;padding:20px;margin-bottom:24px;text-align:center;"><h2 style="color:#7c3aed;margin:0 0 8px;font-size:24px;">{{discount}}</h2><p style="color:#374151;margin:0;font-size:14px;">{{offer_details}}</p>{{#if expires}}<p style="color:#ef4444;margin:8px 0 0;font-size:12px;font-weight:600;">Válido até: {{expires}}</p>{{/if}}</div><a href="{{cta_url}}" style="display:inline-block;background-color:#8b5cf6;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:16px;">{{cta_text}}</a></td></tr><tr><td style="background-color:#f9fafb;padding:24px;text-align:center;"><p style="color:#6b7280;font-size:12px;margin:0;">Você recebeu este email porque é cliente do Receitas Premium.</p><p style="color:#6b7280;font-size:12px;margin:8px 0 0;"><a href="{{unsubscribe_url}}" style="color:#6b7280;">Cancelar inscrição</a></p></td></tr></table></td></tr></table><img src="{{tracking_pixel}}" width="1" height="1" style="display:none;"></body></html>', '["name", "message", "discount", "offer_details", "expires", "image", "cta_url", "cta_text"]');
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmailTemplate {
  id: string;
  name: string;
  description: string | null;
  preview_image: string | null;
  html_template: string;
  variables: string[];
  is_active: boolean;
  created_at: string;
}

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  template_id: string;
  content: Record<string, string>;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  scheduled_at: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: string;
  campaign_id: string;
  user_id: string;
  email: string;
  name: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';
  resend_id: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  failed: number;
  openRate: number;
  clickRate: number;
}

export interface CampaignConversion {
  id: string;
  campaign_id: string;
  recipient_id: string | null;
  email: string;
  product_id: string | null;
  product_name: string | null;
  order_id: string | null;
  amount: number | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  converted_at: string;
}

// Fetch templates
export function useTemplates() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as EmailTemplate[];
    },
  });
}

// Fetch campaigns
export function useCampaigns() {
  return useQuery({
    queryKey: ['email-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EmailCampaign[];
    },
  });
}

// Fetch single campaign with stats
export function useCampaign(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['email-campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      
      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      
      if (error) throw error;
      return data as EmailCampaign;
    },
    enabled: !!campaignId,
  });
}

// Fetch campaign stats
export function useCampaignStats(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-stats', campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      
      const { data, error } = await supabase
        .from('campaign_recipients')
        .select('status')
        .eq('campaign_id', campaignId);
      
      if (error) throw error;
      
      const stats: CampaignStats = {
        total: data.length,
        sent: data.filter(r => r.status !== 'pending').length,
        delivered: data.filter(r => ['delivered', 'opened', 'clicked'].includes(r.status)).length,
        opened: data.filter(r => ['opened', 'clicked'].includes(r.status)).length,
        clicked: data.filter(r => r.status === 'clicked').length,
        bounced: data.filter(r => r.status === 'bounced').length,
        failed: data.filter(r => r.status === 'failed').length,
        openRate: 0,
        clickRate: 0,
      };
      
      if (stats.delivered > 0) {
        stats.openRate = Math.round((stats.opened / stats.delivered) * 100);
        stats.clickRate = Math.round((stats.clicked / stats.delivered) * 100);
      }
      
      return stats;
    },
    enabled: !!campaignId,
    refetchInterval: 5000, // Refresh every 5 seconds during sending
  });
}

// Fetch campaign conversions
export function useCampaignConversions(campaignId: string | undefined) {
  return useQuery({
    queryKey: ['campaign-conversions', campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      
      const { data, error } = await supabase
        .from('campaign_conversions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('converted_at', { ascending: false });
      
      if (error) throw error;
      return data as CampaignConversion[];
    },
    enabled: !!campaignId,
  });
}

// Create campaign
export function useCreateCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (campaign: Omit<EmailCampaign, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('email_campaigns')
        .insert({
          ...campaign,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data as EmailCampaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success('Campanha criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar campanha: ${error.message}`);
    },
  });
}

// Update campaign
export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailCampaign> & { id: string }) => {
      const { data, error } = await supabase
        .from('email_campaigns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as EmailCampaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['email-campaign', data.id] });
      toast.success('Campanha atualizada!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar campanha: ${error.message}`);
    },
  });
}

// Delete campaign
export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('email_campaigns')
        .delete()
        .eq('id', campaignId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success('Campanha excluída!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir campanha: ${error.message}`);
    },
  });
}

// Send campaign
export function useSendCampaign() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('send-campaign', {
        body: { campaignId },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });
      
      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success(`Campanha enviada! ${data.sent} emails enviados, ${data.errors} erros.`);
    },
    onError: (error: any) => {
      toast.error(`Erro ao enviar campanha: ${error.message}`);
    },
  });
}

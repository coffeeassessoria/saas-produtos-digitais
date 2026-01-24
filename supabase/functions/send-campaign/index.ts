import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = "https://recipe-stream-hub.lovable.app";

interface CampaignRequest {
  campaignId: string;
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  
  // Handle {{#if variable}}...{{/if}} blocks
  const ifRegex = /\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  result = result.replace(ifRegex, (match, varName, content) => {
    return variables[varName] ? content : '';
  });
  
  // Replace simple {{variable}} placeholders
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value || '');
  }
  
  return result;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify admin role
    const supabaseUser = createClient(SUPABASE_URL, authHeader.replace("Bearer ", ""), {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) {
      throw new Error("Unauthorized");
    }

    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      throw new Error("Admin access required");
    }

    const { campaignId }: CampaignRequest = await req.json();

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("email_campaigns")
      .select("*, email_templates(*)")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      throw new Error("Campaign not found");
    }

    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      throw new Error("Campaign already sent or in progress");
    }

    // Update campaign status to sending
    await supabaseAdmin
      .from("email_campaigns")
      .update({ status: "sending" })
      .eq("id", campaignId);

    // Get all users (recipients)
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, name, user_id");

    if (profilesError) {
      throw new Error("Failed to fetch recipients");
    }

    // Get template
    const { data: template } = await supabaseAdmin
      .from("email_templates")
      .select("*")
      .eq("id", campaign.template_id)
      .single();

    if (!template) {
      throw new Error("Template not found");
    }

    const content = campaign.content as Record<string, string>;
    const campaignSlug = campaign.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    
    let sentCount = 0;
    let errorCount = 0;

    // Create recipient records and send emails
    for (const profile of profiles || []) {
      const recipientId = crypto.randomUUID();
      
      // Create recipient record
      await supabaseAdmin
        .from("campaign_recipients")
        .insert({
          id: recipientId,
          campaign_id: campaignId,
          user_id: profile.user_id || profile.id,
          email: profile.email,
          name: profile.name,
          status: "pending",
        });

      // Build tracking URLs
      const trackingPixel = `${SUPABASE_URL}/functions/v1/track-email?type=open&rid=${recipientId}&cid=${campaignId}`;
      const unsubscribeUrl = `${APP_URL}/unsubscribe?email=${encodeURIComponent(profile.email)}`;

      // Add UTM parameters to CTA URL
      let ctaUrl = content.cta_url || APP_URL;
      const utmParams = new URLSearchParams({
        utm_source: "email",
        utm_medium: "campaign",
        utm_campaign: campaignSlug,
      });
      ctaUrl = `${SUPABASE_URL}/functions/v1/track-email?type=click&rid=${recipientId}&cid=${campaignId}&url=${encodeURIComponent(ctaUrl + (ctaUrl.includes('?') ? '&' : '?') + utmParams.toString())}`;

      // Build email variables
      const emailVariables: Record<string, string> = {
        name: profile.name || profile.email.split('@')[0],
        subject: campaign.subject,
        tracking_pixel: trackingPixel,
        unsubscribe_url: unsubscribeUrl,
        cta_url: ctaUrl,
        ...content,
      };

      // Generate HTML
      const htmlContent = replaceVariables(template.html_template, emailVariables);

      try {
        const emailResponse = await resend.emails.send({
          from: "Receitas Premium <noreply@app.nexusbazar.com>",
          to: [profile.email],
          subject: campaign.subject,
          html: htmlContent,
        });

        await supabaseAdmin
          .from("campaign_recipients")
          .update({
            status: "sent",
            resend_id: emailResponse.data?.id || null,
            sent_at: new Date().toISOString(),
          })
          .eq("id", recipientId);

        sentCount++;
      } catch (emailError: any) {
        console.error(`Failed to send to ${profile.email}:`, emailError);
        
        await supabaseAdmin
          .from("campaign_recipients")
          .update({
            status: "failed",
            error_message: emailError.message || "Unknown error",
          })
          .eq("id", recipientId);

        errorCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Update campaign status to sent
    await supabaseAdmin
      .from("email_campaigns")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        errors: errorCount,
        total: profiles?.length || 0,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-campaign:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

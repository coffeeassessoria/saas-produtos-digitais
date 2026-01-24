import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { encode as encodeHex } from "https://deno.land/std@0.190.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kiwify-signature",
};

const KIWIFY_TOKEN = Deno.env.get("KIWIFY_WEBHOOK_TOKEN");
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Verify HMAC-SHA1 signature from Kiwify
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const computedSignature = decoder.decode(encodeHex(new Uint8Array(signatureBuffer)));
  return computedSignature === signature.toLowerCase();
}

// Map Kiwify product IDs to module slugs
const PRODUCT_MODULE_MAP: Record<string, string> = {
  // Produto principal - Combo de Receitas
  "4acb8130-d3a9-11f0-bfc4-571866606626": "controle-glicemico",
  // GlicoFit
  "e7762ee0-f5a0-11f0-98ff-8f67427cd6c5": "glicofit",
  // Fallback
  "default": "controle-glicemico"
};

// Real Kiwify payload structure - data nested under "order"
interface KiwifyRealPayload {
  url?: string;
  signature?: string;
  order: {
    order_id: string;
    order_ref: string;
    order_status: string;
    webhook_event_type: string;
    Product: {
      product_id: string;
      product_name: string;
      product_offer_id?: string;
      product_offer_name?: string;
    };
    Customer: {
      full_name: string;
      first_name: string;
      email: string;
      mobile?: string;
      CPF?: string;
    };
    created_at: string;
    updated_at: string;
    approved_date?: string;
    refunded_at?: string;
  };
}

// Flat format for testing from admin panel
interface KiwifyTestPayload {
  order_id: string;
  order_status: string;
  product_id?: string;
  product_name?: string;
  customer_email?: string;
  customer_name?: string;
  Customer?: {
    email?: string;
    full_name?: string;
  };
  Product?: {
    product_id?: string;
    product_name?: string;
  };
}

// Generate welcome email HTML with magic link
const generateWelcomeEmailHtml = (loginUrl: string, customerName: string, productName: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #16a34a; padding: 32px 24px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 28px; margin: 0; font-weight: bold;">
                🎉 Parabéns pela compra!
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 24px; text-align: center;">
              <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 16px 0; font-weight: bold;">
                Olá, ${customerName}!
              </h2>
              
              <p style="color: #4b5563; font-size: 18px; line-height: 1.6; margin: 0 0 8px 0;">
                Sua compra do <strong>${productName}</strong> foi confirmada!
              </p>
              
              <p style="color: #4b5563; font-size: 18px; line-height: 1.6; margin: 0 0 32px 0;">
                Clique no botão verde abaixo para acessar suas receitas:
              </p>
              
              <!-- Big Green Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" 
                       style="display: block; 
                              background-color: #16a34a; 
                              color: #ffffff; 
                              text-decoration: none; 
                              font-size: 22px; 
                              font-weight: bold; 
                              padding: 24px 48px; 
                              border-radius: 12px;
                              box-shadow: 0 4px 14px rgba(22, 163, 74, 0.4);">
                      ▶ ACESSAR MINHAS RECEITAS
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9ca3af; font-size: 14px; margin: 32px 0 0 0;">
                Este link expira em 1 hora. Você pode solicitar um novo link a qualquer momento em <a href="https://app.nexusbazar.com" style="color: #16a34a;">app.nexusbazar.com</a>
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 24px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;">
            </td>
          </tr>
          
          <!-- Instructions -->
          <tr>
            <td style="padding: 24px; text-align: center;">
              <h3 style="color: #1f2937; font-size: 18px; margin: 0 0 16px 0;">
                📧 Para acessos futuros:
              </h3>
              <ol style="color: #4b5563; font-size: 16px; text-align: left; margin: 0; padding-left: 24px; line-height: 1.8;">
                <li>Acesse <strong>app.nexusbazar.com</strong></li>
                <li>Digite seu e-mail</li>
                <li>Clique no link que enviaremos</li>
              </ol>
            </td>
          </tr>
          
          <!-- Alternative Link -->
          <tr>
            <td style="padding: 24px; text-align: center; background-color: #f9fafb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">
                Se o botão não funcionar, copie e cole este link no navegador:
              </p>
              <p style="color: #16a34a; font-size: 12px; word-break: break-all; margin: 0;">
                ${loginUrl}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #16a34a; padding: 24px; text-align: center;">
              <p style="color: #ffffff; font-size: 16px; margin: 0; font-weight: bold;">
                🍳 Glico Leve
              </p>
              <p style="color: #dcfce7; font-size: 14px; margin: 8px 0 0 0;">
                Receitas para Controle Glicêmico
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// Send welcome email with magic link
async function sendWelcomeEmail(
  supabase: any,
  email: string,
  customerName: string,
  productName: string
): Promise<void> {
  try {
    // Generate magic link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: "https://app.nexusbazar.com"
      }
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Error generating magic link for welcome email:", linkError);
      return;
    }

    const loginUrl = linkData.properties.action_link;
    console.log("Magic link generated for welcome email:", email);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Glico Leve <noreply@app.nexusbazar.com>",
      to: [email],
      subject: "🎉 Sua compra foi confirmada! Acesse suas receitas",
      html: generateWelcomeEmailHtml(loginUrl, customerName, productName),
    });

    console.log("Welcome email sent successfully:", emailResponse);
  } catch (error) {
    console.error("Error sending welcome email:", error);
    // Don't throw - welcome email is not critical
  }
}

// Helper to detect payload format and extract data
function extractPayloadData(rawPayload: any): {
  order_status: string;
  product_id: string;
  product_name: string;
  customer_email: string;
  customer_name: string;
  signature?: string;
} {
  // Check if it's the real Kiwify format (has "order" wrapper)
  if (rawPayload.order && typeof rawPayload.order === 'object') {
    const order = rawPayload.order;
    return {
      order_status: order.order_status,
      product_id: order.Product?.product_id || '',
      product_name: order.Product?.product_name || 'Produto',
      customer_email: order.Customer?.email || '',
      customer_name: order.Customer?.full_name || order.Customer?.first_name || 'Cliente',
      signature: rawPayload.signature
    };
  }
  
  // Flat test format (from admin panel)
  return {
    order_status: rawPayload.order_status,
    product_id: rawPayload.product_id || rawPayload.Product?.product_id || '',
    product_name: rawPayload.product_name || rawPayload.Product?.product_name || 'Produto',
    customer_email: rawPayload.customer_email || rawPayload.Customer?.email || '',
    customer_name: rawPayload.customer_name || rawPayload.Customer?.full_name || 'Cliente',
    signature: undefined
  };
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Clone the request to read body twice (for signature verification and parsing)
    const bodyText = await req.text();
    const rawPayload = JSON.parse(bodyText);
    console.log("Kiwify webhook received:", JSON.stringify(rawPayload, null, 2));

    // Extract data from either format
    const { order_status, product_id, product_name, customer_email, customer_name, signature } = extractPayloadData(rawPayload);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if this is an admin test request
    const isAdminTest = req.headers.get("x-admin-test") === "true";
    
    if (isAdminTest) {
      // Verify admin authorization for test requests
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Admin test requires authentication" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      // Create client with user's token to verify auth
      const userSupabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      
      const { data: userData, error: userError } = await userSupabase.auth.getUser();
      
      if (userError || !userData?.user) {
        return new Response(
          JSON.stringify({ error: "Invalid authentication token" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const userId = userData.user.id;
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      
      if (!roleData) {
        return new Response(
          JSON.stringify({ error: "Admin access required for webhook testing" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.log("Admin test request authorized for user:", userId);
    } else {
      // Real webhook - require valid signature
      if (!KIWIFY_TOKEN) {
        console.error("KIWIFY_WEBHOOK_TOKEN not configured");
        return new Response(
          JSON.stringify({ error: "Webhook not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const headerSignature = req.headers.get("x-kiwify-signature");
      const providedSignature = signature || headerSignature;
      
      if (!providedSignature) {
        console.error("No webhook signature provided");
        return new Response(
          JSON.stringify({ error: "Missing signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const isValid = await verifySignature(bodyText, providedSignature, KIWIFY_TOKEN);
      if (!isValid) {
        console.error("Invalid webhook signature. Computed HMAC does not match provided signature:", providedSignature.substring(0, 8) + "...");
        return new Response(
          JSON.stringify({ error: "Invalid signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.log("Webhook signature verified successfully");
    }

    // Validate required email
    if (!customer_email) {
      console.error("Missing customer email in payload");
      return new Response(
        JSON.stringify({ error: "Missing customer email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get module slug from product ID, fallback to default
    const moduleSlug = (product_id && PRODUCT_MODULE_MAP[product_id]) || PRODUCT_MODULE_MAP["default"];
    console.log(`Processing: status=${order_status}, email=${customer_email}, product=${product_id}, module=${moduleSlug}`);

    if (order_status === "paid" || order_status === "approved") {
      // Order approved - create user and grant access
      console.log(`Granting access to ${customer_email} for module ${moduleSlug}`);

      // Check if user exists in auth
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      let userId: string;
      let isNewUser = false;
      
      const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === customer_email.toLowerCase());
      
      if (existingUser) {
        userId = existingUser.id;
        console.log("User already exists:", userId);
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: customer_email,
          email_confirm: true,
          user_metadata: { full_name: customer_name }
        });

        if (createError) {
          console.error("Error creating user:", createError);
          throw createError;
        }
        userId = newUser.user.id;
        isNewUser = true;
        console.log("Created new user:", userId);
      }

      // Upsert profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: crypto.randomUUID(),
          user_id: userId,
          email: customer_email,
          name: customer_name
        }, { onConflict: "user_id" });

      if (profileError) {
        console.error("Error upserting profile:", profileError);
      }

      // Grant module access
      const { error: moduleError } = await supabase
        .from("user_modules")
        .upsert({
          user_id: userId,
          email: customer_email,
          module_id: moduleSlug
        }, { onConflict: "user_id,module_id" });

      if (moduleError) {
        console.error("Error granting module access:", moduleError);
      }

      console.log(`Access granted to ${customer_email} for module ${moduleSlug}`);

      // Send welcome email with magic link
      await sendWelcomeEmail(supabase, customer_email, customer_name, product_name);

      // Track conversion if from campaign (UTM parameter)
      const utmCampaign = rawPayload.utm_campaign || rawPayload.order?.metadata?.utm_campaign;
      if (utmCampaign) {
        try {
          // Find campaign by slug
          const campaignSlug = utmCampaign.toLowerCase();
          const { data: campaigns } = await supabase
            .from("email_campaigns")
            .select("id")
            .ilike("name", `%${campaignSlug.replace(/-/g, '%')}%`)
            .limit(1);

          if (campaigns && campaigns.length > 0) {
            const campaignId = campaigns[0].id;
            
            // Find recipient
            const { data: recipient } = await supabase
              .from("campaign_recipients")
              .select("id")
              .eq("campaign_id", campaignId)
              .eq("email", customer_email)
              .maybeSingle();

            await supabase.from("campaign_conversions").insert({
              campaign_id: campaignId,
              recipient_id: recipient?.id || null,
              email: customer_email,
              product_id: product_id,
              product_name: product_name,
              order_id: rawPayload.order?.order_id || rawPayload.order_id,
              amount: rawPayload.order?.Commissions?.charge_amount || null,
              utm_source: "email",
              utm_medium: "campaign",
              utm_campaign: utmCampaign,
            });
            console.log("Conversion tracked for campaign:", campaignId);
          }
        } catch (convError) {
          console.error("Error tracking conversion:", convError);
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: "access_granted", 
          email: customer_email, 
          module: moduleSlug,
          is_new_user: isNewUser,
          welcome_email_sent: true
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (order_status === "refunded" || order_status === "chargedback") {
      // Order refunded - revoke access
      console.log(`Revoking access for ${customer_email} for module ${moduleSlug}`);

      // Find user by email
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", customer_email)
        .maybeSingle();

      if (profile) {
        // Remove module access
        const { error: deleteError } = await supabase
          .from("user_modules")
          .delete()
          .eq("user_id", profile.user_id)
          .eq("module_id", moduleSlug);

        if (deleteError) {
          console.error("Error revoking access:", deleteError);
        }

        console.log(`Access revoked for ${customer_email}`);
      }

      return new Response(
        JSON.stringify({ success: true, action: "access_revoked", email: customer_email, module: moduleSlug }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Unknown status - just acknowledge
    console.log(`Unknown order status: ${order_status}, acknowledging`);
    return new Response(
      JSON.stringify({ success: true, action: "ignored", status: order_status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error processing webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

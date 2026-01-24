import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface SendLoginLinkRequest {
  email: string;
}

const generateEmailHtml = (loginUrl: string, userName?: string) => `
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
                🍳 Glico Leve
              </h1>
              <p style="color: #dcfce7; font-size: 16px; margin: 8px 0 0 0;">
                Suas Receitas para Controle Glicêmico
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 24px; text-align: center;">
              <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 16px 0; font-weight: bold;">
                ${userName ? `Olá, ${userName}!` : 'Olá!'}
              </h2>
              
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
                      ▶ ENTRAR NAS RECEITAS
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9ca3af; font-size: 14px; margin: 32px 0 0 0;">
                Este link expira em 1 hora.
              </p>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 24px;">
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;">
            </td>
          </tr>
          
          <!-- Alternative Link -->
          <tr>
            <td style="padding: 24px; text-align: center;">
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
            <td style="background-color: #f9fafb; padding: 24px; text-align: center;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Se você não solicitou este email, pode ignorá-lo com segurança.
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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: SendLoginLinkRequest = await req.json();
    
    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log("Processing login request for:", normalizedEmail);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if user exists in auth
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const existingUser = usersData?.users?.find(u => u.email === normalizedEmail);

    if (!existingUser) {
      console.log("User not found:", normalizedEmail);
      return new Response(
        JSON.stringify({ 
          error: "email_not_found",
          message: "Este e-mail não está cadastrado. Verifique se usou o e-mail da compra." 
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    // Generate magic link
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: {
        redirectTo: "https://app.nexusbazar.com"
      }
    });

    if (linkError || !linkData) {
      console.error("Error generating magic link:", linkError);
      return new Response(
        JSON.stringify({ error: "Erro ao gerar link de acesso" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const loginUrl = linkData.properties?.action_link;
    if (!loginUrl) {
      console.error("No action_link in response");
      return new Response(
        JSON.stringify({ error: "Erro ao gerar link de acesso" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Magic link generated for:", normalizedEmail);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Glico Leve <noreply@app.nexusbazar.com>",
      to: [normalizedEmail],
      subject: "🔑 Seu acesso às receitas Glico Leve",
      html: generateEmailHtml(loginUrl, profile?.name || existingUser.user_metadata?.full_name),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Link de acesso enviado para seu e-mail!" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-login-link:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);

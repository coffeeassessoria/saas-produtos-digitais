import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendMagicLinkRequest {
  email: string;
  name?: string;
  moduleId?: string;
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
                🎉 Bem-vindo ao Glico Leve!
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 24px; text-align: center;">
              <h2 style="color: #1f2937; font-size: 24px; margin: 0 0 16px 0; font-weight: bold;">
                Olá${userName ? `, ${userName}` : ''}!
              </h2>
              
              <p style="color: #4b5563; font-size: 18px; line-height: 1.6; margin: 0 0 8px 0;">
                Seu acesso às receitas foi liberado!
              </p>
              
              <p style="color: #4b5563; font-size: 18px; line-height: 1.6; margin: 0 0 32px 0;">
                Clique no botão verde abaixo para acessar:
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
                Este link expira em 1 hora.
              </p>
            </td>
          </tr>
          
          <!-- Instructions -->
          <tr>
            <td style="padding: 24px; text-align: center; background-color: #f9fafb;">
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { email, name, moduleId }: SendMagicLinkRequest = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const defaultModule = moduleId || "controle-glicemico";

    console.log(`Processing magic link for: ${normalizedEmail}`);

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const user = existingUser?.users?.find(u => u.email === normalizedEmail);

    let userId: string;

    if (user) {
      userId = user.id;
      console.log(`User already exists: ${userId}`);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        email_confirm: true,
        user_metadata: { full_name: name }
      });

      if (createError) {
        console.error("Error creating user:", createError);
        throw new Error(`Failed to create user: ${createError.message}`);
      }

      userId = newUser.user.id;
      console.log(`Created new user: ${userId}`);

      // Create profile
      await supabaseAdmin.from("profiles").upsert({
        user_id: userId,
        email: normalizedEmail,
        name: name || null
      }, { onConflict: "user_id" });
    }

    // Add module access
    await supabaseAdmin.from("user_modules").upsert({
      user_id: userId,
      email: normalizedEmail,
      module_id: defaultModule
    }, { onConflict: "user_id,module_id" });

    console.log(`Added module ${defaultModule} access for user`);

    // Generate magic link
    const { data: magicLinkData, error: magicLinkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: {
        redirectTo: "https://app.nexusbazar.com"
      }
    });

    if (magicLinkError) {
      console.error("Error generating magic link:", magicLinkError);
      throw new Error(`Failed to generate magic link: ${magicLinkError.message}`);
    }

    const magicLink = magicLinkData.properties.action_link;
    console.log(`Generated magic link for ${normalizedEmail}`);

    // Send email with magic link
    const emailResponse = await resend.emails.send({
      from: "Glico Leve <noreply@app.nexusbazar.com>",
      to: [normalizedEmail],
      subject: "🎉 Seu acesso às Receitas Glico Leve",
      html: generateEmailHtml(magicLink, name),
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId,
        emailId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-magic-link function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);

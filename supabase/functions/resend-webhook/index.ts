import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ResendWebhookEvent {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // For bounce/complaint events
    bounce?: {
      message: string;
    };
  };
}

serve(async (req: Request): Promise<Response> => {
  try {
    const event: ResendWebhookEvent = await req.json();
    
    console.log("Resend webhook received:", event.type, event.data.email_id);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find recipient by resend_id
    const { data: recipient } = await supabase
      .from("campaign_recipients")
      .select("id, status")
      .eq("resend_id", event.data.email_id)
      .single();

    if (!recipient) {
      console.log("Recipient not found for email:", event.data.email_id);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const updates: Record<string, any> = {};

    switch (event.type) {
      case "email.delivered":
        updates.status = "delivered";
        updates.delivered_at = new Date().toISOString();
        break;
      
      case "email.opened":
        // Only update if not already clicked
        if (recipient.status !== "clicked") {
          updates.status = "opened";
          updates.opened_at = new Date().toISOString();
        }
        break;
      
      case "email.clicked":
        updates.status = "clicked";
        updates.clicked_at = new Date().toISOString();
        break;
      
      case "email.bounced":
        updates.status = "bounced";
        updates.error_message = event.data.bounce?.message || "Email bounced";
        break;
      
      case "email.complained":
        updates.status = "failed";
        updates.error_message = "Recipient marked as spam";
        break;
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from("campaign_recipients")
        .update(updates)
        .eq("id", recipient.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in resend-webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

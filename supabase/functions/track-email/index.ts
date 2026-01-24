import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// 1x1 transparent PNG pixel
const TRACKING_PIXEL = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

serve(async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type"); // "open" or "click"
    const recipientId = url.searchParams.get("rid");
    const campaignId = url.searchParams.get("cid");
    const redirectUrl = url.searchParams.get("url");

    if (!recipientId || !campaignId || !type) {
      if (type === "open") {
        return new Response(TRACKING_PIXEL, {
          headers: { "Content-Type": "image/png" },
        });
      }
      return new Response("Missing parameters", { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userAgent = req.headers.get("user-agent") || null;
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : null;

    if (type === "open") {
      // Track email open
      const { data: recipient } = await supabase
        .from("campaign_recipients")
        .select("opened_at")
        .eq("id", recipientId)
        .single();

      // Only update if not already opened
      if (recipient && !recipient.opened_at) {
        await supabase
          .from("campaign_recipients")
          .update({
            status: "opened",
            opened_at: new Date().toISOString(),
          })
          .eq("id", recipientId);
      }

      return new Response(TRACKING_PIXEL, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }

    if (type === "click" && redirectUrl) {
      // Track click
      const decodedUrl = decodeURIComponent(redirectUrl);
      const urlObj = new URL(decodedUrl);
      
      // Extract UTM parameters
      const utmSource = urlObj.searchParams.get("utm_source");
      const utmMedium = urlObj.searchParams.get("utm_medium");
      const utmCampaign = urlObj.searchParams.get("utm_campaign");

      // Update recipient status
      const { data: recipient } = await supabase
        .from("campaign_recipients")
        .select("clicked_at")
        .eq("id", recipientId)
        .single();

      if (recipient && !recipient.clicked_at) {
        await supabase
          .from("campaign_recipients")
          .update({
            status: "clicked",
            clicked_at: new Date().toISOString(),
          })
          .eq("id", recipientId);
      }

      // Record click details
      await supabase.from("campaign_clicks").insert({
        recipient_id: recipientId,
        campaign_id: campaignId,
        url: decodedUrl,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        user_agent: userAgent,
        ip_address: ipAddress,
      });

      // Redirect to the actual URL
      return new Response(null, {
        status: 302,
        headers: {
          Location: decodedUrl,
        },
      });
    }

    return new Response("Invalid request", { status: 400 });
  } catch (error: any) {
    console.error("Error in track-email:", error);
    
    // Still return the pixel for opens to not break email display
    return new Response(TRACKING_PIXEL, {
      headers: { "Content-Type": "image/png" },
    });
  }
});

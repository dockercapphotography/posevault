import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

/**
 * Cron-style edge function that deactivates expired share links
 * and sends expiry notifications to gallery owners.
 * Should be scheduled to run periodically (e.g., every hour).
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find active shares that have expired
    const now = new Date().toISOString();
    const { data: expiredShares, error: fetchError } = await supabase
      .from("shared_galleries")
      .select("id, owner_id, gallery_id")
      .eq("is_active", true)
      .not("expires_at", "is", null)
      .lt("expires_at", now);

    if (fetchError) {
      return new Response(
        JSON.stringify({ ok: false, error: fetchError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!expiredShares || expiredShares.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, message: "No expired shares found", deactivated: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let deactivated = 0;
    let notified = 0;

    for (const share of expiredShares) {
      // Deactivate the share
      const { error: updateError } = await supabase
        .from("shared_galleries")
        .update({ is_active: false, updated_at: now })
        .eq("id", share.id);

      if (updateError) {
        console.error(`Failed to deactivate share ${share.id}:`, updateError);
        continue;
      }
      deactivated++;

      // Get gallery name for notification message
      const { data: gallery } = await supabase
        .from("categories")
        .select("name")
        .eq("uid", share.gallery_id)
        .maybeSingle();

      const galleryName = gallery?.name || "a gallery";

      // Check notification preferences before sending
      let shouldNotify = true;

      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select("quiet_mode, notify_on_expiry")
        .eq("user_id", share.owner_id)
        .is("shared_gallery_id", null)
        .maybeSingle();

      if (prefs?.quiet_mode || prefs?.notify_on_expiry === false) {
        shouldNotify = false;
      }

      // Also check per-share prefs
      const { data: sharePrefs } = await supabase
        .from("notification_preferences")
        .select("quiet_mode, notify_on_expiry")
        .eq("user_id", share.owner_id)
        .eq("shared_gallery_id", share.id)
        .maybeSingle();

      if (sharePrefs) {
        if (sharePrefs.quiet_mode || sharePrefs.notify_on_expiry === false) {
          shouldNotify = false;
        }
      }

      if (shouldNotify) {
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: share.owner_id,
            shared_gallery_id: share.id,
            type: "share_expired",
            message: `Your share link for "${galleryName}" has expired and been deactivated`,
          });

        if (!notifError) notified++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, deactivated, notified }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "internal_error", details: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

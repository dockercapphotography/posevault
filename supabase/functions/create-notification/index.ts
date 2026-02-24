import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const { sharedGalleryId, type, viewerName, imageId } = await req.json();

    if (!sharedGalleryId || !type) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Look up the shared gallery to get the owner
    const { data: share, error: shareError } = await supabase
      .from("shared_galleries")
      .select("id, owner_id, gallery_id")
      .eq("id", sharedGalleryId)
      .single();

    if (shareError || !share) {
      return new Response(
        JSON.stringify({ ok: false, error: "share_not_found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get the gallery name for the notification message
    const { data: gallery } = await supabase
      .from("categories")
      .select("name")
      .eq("uid", share.gallery_id)
      .maybeSingle();

    const galleryName = gallery?.name || "a gallery";

    // Check notification preferences
    // First check per-share prefs, then global prefs
    let prefs: any = null;
    const { data: sharePrefs } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", share.owner_id)
      .eq("shared_gallery_id", sharedGalleryId)
      .maybeSingle();

    if (sharePrefs) {
      prefs = sharePrefs;
    } else {
      const { data: globalPrefs } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", share.owner_id)
        .is("shared_gallery_id", null)
        .maybeSingle();

      prefs = globalPrefs;
    }

    // Check quiet mode
    if (prefs?.quiet_mode) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true, reason: "quiet_mode" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check per-type preference
    const typeToField: Record<string, string> = {
      view: "notify_on_view",
      favorite: "notify_on_favorite",
      upload_pending: "notify_on_upload",
      comment: "notify_on_comment",
      share_expired: "notify_on_expiry",
    };

    // Defaults when no prefs row exists
    const defaults: Record<string, boolean> = {
      notify_on_view: false,
      notify_on_favorite: true,
      notify_on_upload: true,
      notify_on_comment: true,
      notify_on_expiry: true,
    };

    const prefField = typeToField[type];
    if (prefField) {
      const enabled = prefs ? prefs[prefField] : defaults[prefField];
      if (enabled === false) {
        return new Response(
          JSON.stringify({ ok: true, skipped: true, reason: "preference_disabled" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Build human-readable message
    const name = viewerName || "Someone";
    const messages: Record<string, string> = {
      view: `${name} viewed "${galleryName}"`,
      favorite: `${name} favorited an image in "${galleryName}"`,
      upload_pending: `${name} uploaded an image to "${galleryName}" (pending approval)`,
      comment: `${name} commented on an image in "${galleryName}"`,
      share_expired: `Your share link for "${galleryName}" has expired`,
    };

    const message = messages[type] || `Activity in "${galleryName}"`;

    // Look up viewer_id by name if provided
    let viewerId = null;
    if (viewerName) {
      const { data: viewer } = await supabase
        .from("share_viewers")
        .select("id")
        .eq("shared_gallery_id", sharedGalleryId)
        .eq("display_name", viewerName)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (viewer) viewerId = viewer.id;
    }

    // Insert notification
    const { error: insertError } = await supabase
      .from("notifications")
      .insert({
        user_id: share.owner_id,
        shared_gallery_id: sharedGalleryId,
        type,
        message,
        viewer_id: viewerId,
        image_id: imageId || null,
      });

    if (insertError) {
      return new Response(
        JSON.stringify({ ok: false, error: insertError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "internal_error", details: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

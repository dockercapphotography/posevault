import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

/**
 * Edge function that aggregates activity data for a shared gallery.
 * Returns total views, unique viewers, most-favorited images, pending uploads,
 * and recent comments.
 */
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
    const { sharedGalleryId } = await req.json();

    if (!sharedGalleryId) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_shared_gallery_id" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify the shared gallery exists
    const { data: share, error: shareError } = await supabase
      .from("shared_galleries")
      .select("id, owner_id")
      .eq("id", sharedGalleryId)
      .single();

    if (shareError || !share) {
      return new Response(
        JSON.stringify({ ok: false, error: "share_not_found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch all data in parallel
    const [viewersResult, favoritesResult, uploadsResult, commentsResult, accessLogResult] = await Promise.all([
      supabase
        .from("share_viewers")
        .select("id, display_name, created_at")
        .eq("shared_gallery_id", sharedGalleryId),
      supabase
        .from("share_favorites")
        .select("image_id, viewer_id")
        .eq("shared_gallery_id", sharedGalleryId),
      supabase
        .from("share_uploads")
        .select("id, approved, viewer_id, uploaded_at")
        .eq("shared_gallery_id", sharedGalleryId),
      supabase
        .from("share_comments")
        .select("id, image_id, viewer_id, created_at, comment_text")
        .eq("shared_gallery_id", sharedGalleryId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("share_access_log")
        .select("id, action, accessed_at")
        .eq("shared_gallery_id", sharedGalleryId),
    ]);

    const viewers = viewersResult.data || [];
    const favorites = favoritesResult.data || [];
    const uploads = uploadsResult.data || [];
    const comments = commentsResult.data || [];
    const accessLog = accessLogResult.data || [];

    // Total views
    const totalViews = accessLog.filter((l: any) => l.action === "view_gallery").length;

    // Most-favorited images (top 5)
    const favCounts: Record<string, number> = {};
    favorites.forEach((f: any) => {
      favCounts[f.image_id] = (favCounts[f.image_id] || 0) + 1;
    });
    const mostFavoritedRaw = Object.entries(favCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Look up r2_key for each favorited image so the dashboard can show thumbnails
    let imageR2Keys: Record<string, string> = {};
    const favImageIds = mostFavoritedRaw.map(([id]) => id);
    if (favImageIds.length > 0) {
      const numericIds = favImageIds.map(Number).filter((n) => !isNaN(n));
      if (numericIds.length > 0) {
        const { data: imgData } = await supabase
          .from("images")
          .select("uid, r2_key")
          .in("uid", numericIds);
        if (imgData) {
          imgData.forEach((img: any) => {
            imageR2Keys[String(img.uid)] = img.r2_key;
          });
        }
      }
    }

    const mostFavorited = mostFavoritedRaw.map(([imageId, count]) => ({
      imageId,
      count,
      r2Key: imageR2Keys[imageId] || null,
    }));

    // Pending / approved uploads
    const pendingUploads = uploads.filter((u: any) => !u.approved).length;
    const approvedUploads = uploads.filter((u: any) => u.approved).length;

    // Build viewer name lookup
    const viewerNames: Record<string, string> = {};
    viewers.forEach((v: any) => { viewerNames[v.id] = v.display_name; });

    // Recent comments with viewer names
    const recentComments = comments.map((c: any) => ({
      id: c.id,
      imageId: c.image_id,
      viewerName: viewerNames[c.viewer_id] || "Unknown",
      text: c.comment_text,
      createdAt: c.created_at,
    }));

    // Viewer list with activity
    const viewerList = viewers.map((v: any) => {
      const viewerFavs = favorites.filter((f: any) => f.viewer_id === v.id).length;
      const viewerUploads = uploads.filter((u: any) => u.viewer_id === v.id).length;
      return {
        id: v.id,
        displayName: v.display_name,
        joinedAt: v.created_at,
        favoriteCount: viewerFavs,
        uploadCount: viewerUploads,
      };
    });

    return new Response(
      JSON.stringify({
        ok: true,
        summary: {
          totalViews,
          uniqueViewers: viewers.length,
          mostFavorited,
          pendingUploads,
          approvedUploads,
          totalFavorites: favorites.length,
          totalComments: comments.length,
          recentComments,
          viewers: viewerList,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "internal_error", details: (err as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

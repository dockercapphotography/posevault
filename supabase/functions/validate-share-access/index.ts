import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
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
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_token" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Use service role key to bypass RLS and read all data
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Step 1: Look up the share by token
    const { data: share, error: shareError } = await supabase
      .from("shared_galleries")
      .select("*")
      .eq("share_token", token)
      .single();

    if (shareError || !share) {
      return new Response(
        JSON.stringify({ ok: false, error: "not_found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 2: Check active status
    if (!share.is_active) {
      return new Response(
        JSON.stringify({ ok: false, error: "share_inactive" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 3: Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ ok: false, error: "share_expired" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 4: Fetch gallery metadata
    const { data: gallery, error: galleryError } = await supabase
      .from("categories")
      .select("uid, name, notes, cover_image_uid")
      .eq("uid", share.gallery_id)
      .is("deleted_at", null)
      .single();

    if (galleryError || !gallery) {
      return new Response(
        JSON.stringify({ ok: false, error: "gallery_not_found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 5: Fetch gallery images (exclude covers and deleted)
    const { data: images, error: imagesError } = await supabase
      .from("images")
      .select("uid, name, notes, r2_key, favorite")
      .eq("category_uid", share.gallery_id)
      .eq("cover_image", false)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (imagesError) {
      return new Response(
        JSON.stringify({ ok: false, error: "images_fetch_failed" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Step 6: Fetch tags for each image
    const imageUids = (images || []).map((img: { uid: number }) => img.uid);

    let imageTags: Record<number, string[]> = {};
    if (imageUids.length > 0) {
      const { data: tagData } = await supabase
        .from("image_tags")
        .select("image_uid, tag_uid, tags(name)")
        .in("image_uid", imageUids);

      if (tagData) {
        for (const row of tagData) {
          const imageUid = row.image_uid;
          const tagName = (row as any).tags?.name;
          if (tagName) {
            if (!imageTags[imageUid]) imageTags[imageUid] = [];
            imageTags[imageUid].push(tagName);
          }
        }
      }
    }

    // Step 7: Build response
    const responseImages = (images || []).map((img: any) => ({
      id: img.uid,
      name: img.name || "",
      notes: img.notes || "",
      r2Key: img.r2_key,
      tags: imageTags[img.uid] || [],
    }));

    return new Response(
      JSON.stringify({
        ok: true,
        data: {
          gallery: {
            name: gallery.name,
            notes: gallery.notes || "",
          },
          images: responseImages,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: "internal_error", details: err.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

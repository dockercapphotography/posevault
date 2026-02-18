export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ==========================================
    // SHARE-IMAGE: Unauthenticated image access for shared galleries
    // ==========================================
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/share-image") {
      const shareToken = url.searchParams.get("token");
      const r2Key = url.searchParams.get("key");

      if (!shareToken || !r2Key) {
        return new Response(
          JSON.stringify({ ok: false, error: "Missing token or key parameter" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Validate share token against Supabase using service role key
      try {
        const supabaseUrl = env.SUPABASE_URL;
        const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
          return new Response(
            JSON.stringify({ ok: false, error: "Server misconfigured" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Query shared_galleries to verify token is active and not expired
        const queryUrl = `${supabaseUrl}/rest/v1/shared_galleries?share_token=eq.${encodeURIComponent(shareToken)}&is_active=eq.true&select=id,owner_id,expires_at`;
        const sgResp = await fetch(queryUrl, {
          headers: {
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`,
          },
        });

        if (!sgResp.ok) {
          return new Response(
            JSON.stringify({ ok: false, error: "Token validation failed" }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const shares = await sgResp.json();
        if (!shares || shares.length === 0) {
          return new Response(
            JSON.stringify({ ok: false, error: "Invalid or inactive share token" }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const share = shares[0];

        // Check expiration
        if (share.expires_at && new Date(share.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ ok: false, error: "Share link has expired" }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Security: verify the R2 key belongs to the share owner
        if (!r2Key.startsWith(`users/${share.owner_id}/`)) {
          return new Response(
            JSON.stringify({ ok: false, error: "Access denied" }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Fetch the image from R2
        const object = await env.MY_BUCKET.get(r2Key);
        if (!object) {
          return new Response(
            JSON.stringify({ ok: false, error: "File not found" }),
            { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const headers = new Headers(corsHeaders);
        headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
        headers.set("Cache-Control", "public, max-age=3600");

        return new Response(object.body, { status: 200, headers });
      } catch (err) {
        return new Response(
          JSON.stringify({ ok: false, error: "Share image fetch failed: " + err.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // ==========================================
    // SHARE-UPLOAD: Viewer image upload for shared galleries
    // ==========================================
    if (request.method === "POST" && url.pathname === "/share-upload") {
      const shareToken = url.searchParams.get("token");

      if (!shareToken) {
        return new Response(
          JSON.stringify({ ok: false, error: "Missing token parameter" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      try {
        const supabaseUrl = env.SUPABASE_URL;
        const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
          return new Response(
            JSON.stringify({ ok: false, error: "Server misconfigured" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Validate share token and check upload permissions
        const queryUrl = `${supabaseUrl}/rest/v1/shared_galleries?share_token=eq.${encodeURIComponent(shareToken)}&is_active=eq.true&select=id,owner_id,expires_at,allow_uploads,require_upload_approval,max_uploads_per_viewer,max_upload_size_mb`;
        const sgResp = await fetch(queryUrl, {
          headers: {
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`,
          },
        });

        if (!sgResp.ok) {
          return new Response(
            JSON.stringify({ ok: false, error: "Token validation failed" }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const shares = await sgResp.json();
        if (!shares || shares.length === 0) {
          return new Response(
            JSON.stringify({ ok: false, error: "Invalid or inactive share token" }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const share = shares[0];

        // Check expiration
        if (share.expires_at && new Date(share.expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ ok: false, error: "Share link has expired" }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Check if uploads are allowed
        if (!share.allow_uploads) {
          return new Response(
            JSON.stringify({ ok: false, error: "Uploads are not enabled for this gallery" }),
            { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Parse multipart form data
        const contentType = request.headers.get("content-type");
        if (!contentType?.includes("multipart/form-data")) {
          return new Response(
            JSON.stringify({ ok: false, error: "Expected multipart upload" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const formData = await request.formData();
        const file = formData.get("file");
        const viewerId = formData.get("viewer_id");
        const sharedGalleryId = formData.get("shared_gallery_id");

        if (!file || !viewerId || !sharedGalleryId) {
          return new Response(
            JSON.stringify({ ok: false, error: "Missing file, viewer_id, or shared_gallery_id" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Check file size limit
        const maxBytes = (share.max_upload_size_mb || 10) * 1024 * 1024;
        if (file.size > maxBytes) {
          return new Response(
            JSON.stringify({ ok: false, error: `File exceeds ${share.max_upload_size_mb || 10}MB limit` }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        // Check per-viewer upload limit
        if (share.max_uploads_per_viewer !== null) {
          const countUrl = `${supabaseUrl}/rest/v1/share_uploads?shared_gallery_id=eq.${sharedGalleryId}&viewer_id=eq.${viewerId}&select=id`;
          const countResp = await fetch(countUrl, {
            headers: {
              "apikey": serviceKey,
              "Authorization": `Bearer ${serviceKey}`,
              "Prefer": "count=exact",
              "Range-Unit": "items",
              "Range": "0-0",
            },
          });
          const contentRange = countResp.headers.get("content-range");
          const currentCount = contentRange ? parseInt(contentRange.split("/")[1]) || 0 : 0;

          if (currentCount >= share.max_uploads_per_viewer) {
            return new Response(
              JSON.stringify({ ok: false, error: `Upload limit reached (${share.max_uploads_per_viewer} max)` }),
              { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
            );
          }
        }

        // Upload to R2 under the gallery owner's namespace
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const r2Key = `users/${share.owner_id}/share-uploads/${share.id}/${timestamp}-${safeName}`;

        await env.MY_BUCKET.put(r2Key, file.stream(), {
          httpMetadata: { contentType: file.type },
        });

        // Insert record into share_uploads table
        const approved = !share.require_upload_approval;
        const insertUrl = `${supabaseUrl}/rest/v1/share_uploads`;
        const insertResp = await fetch(insertUrl, {
          method: "POST",
          headers: {
            "apikey": serviceKey,
            "Authorization": `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
          },
          body: JSON.stringify({
            shared_gallery_id: sharedGalleryId,
            image_url: r2Key,
            original_filename: file.name,
            viewer_id: viewerId,
            approved,
          }),
        });

        if (!insertResp.ok) {
          // Clean up the R2 upload on DB failure
          await env.MY_BUCKET.delete(r2Key);
          return new Response(
            JSON.stringify({ ok: false, error: "Failed to record upload" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const insertData = await insertResp.json();

        return new Response(
          JSON.stringify({
            ok: true,
            data: insertData[0] || insertData,
            approved,
            message: approved ? "Upload added to gallery" : "Upload submitted for approval",
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ ok: false, error: "Share upload failed: " + err.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // ==========================================
    // AUTH: Extract and decode JWT for all methods
    // ==========================================
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.split(" ")[1];
    let userId;
    try {
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("Malformed token");
      const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const payloadJson = atob(payloadB64);
      const payload = JSON.parse(payloadJson);
      userId = payload.sub;
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // ==========================================
    // GET: Fetch an image from R2
    // ==========================================
    if (request.method === "GET") {
      const url = new URL(request.url);
      // The key is everything after the first /
      const key = decodeURIComponent(url.pathname.slice(1));

      if (!key) {
        return new Response(
          JSON.stringify({ ok: false, error: "No key provided" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Security: ensure the user can only access their own files
      if (!key.startsWith(`users/${userId}/`)) {
        return new Response(
          JSON.stringify({ ok: false, error: "Access denied" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      try {
        const object = await env.MY_BUCKET.get(key);
        if (!object) {
          return new Response(
            JSON.stringify({ ok: false, error: "File not found" }),
            { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        const headers = new Headers(corsHeaders);
        headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
        headers.set("Cache-Control", "public, max-age=31536000, immutable");

        return new Response(object.body, { status: 200, headers });
      } catch (err) {
        return new Response(
          JSON.stringify({ ok: false, error: "R2 fetch failed: " + err.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // ==========================================
    // DELETE: Remove an image from R2
    // ==========================================
    if (request.method === "DELETE") {
      const url = new URL(request.url);
      const key = decodeURIComponent(url.pathname.slice(1));

      if (!key) {
        return new Response(
          JSON.stringify({ ok: false, error: "No key provided" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Security: ensure the user can only delete their own files
      if (!key.startsWith(`users/${userId}/`)) {
        return new Response(
          JSON.stringify({ ok: false, error: "Access denied" }),
          { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      try {
        await env.MY_BUCKET.delete(key);
        return new Response(
          JSON.stringify({ ok: true, key }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ ok: false, error: "R2 delete failed: " + err.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // ==========================================
    // POST: Upload an image to R2
    // ==========================================
    if (request.method === "POST") {
      const contentType = request.headers.get("content-type");
      if (!contentType?.includes("multipart/form-data")) {
        return new Response(
          JSON.stringify({ ok: false, error: "Expected multipart upload" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const formData = await request.formData();
      const file = formData.get("file");
      if (!file) {
        return new Response(
          JSON.stringify({ ok: false, error: "No file provided" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const key = `users/${userId}/${file.name}`;
      try {
        await env.MY_BUCKET.put(key, file.stream(), {
          httpMetadata: { contentType: file.type },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ ok: false, error: "R2 upload failed: " + err.message }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ ok: true, key, size: file.size }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Method not allowed
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  },
};

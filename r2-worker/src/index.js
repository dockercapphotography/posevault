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

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Authorization, Content-Type",
        },
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { "Access-Control-Allow-Origin": "*" },
      });
    }

    // Get token
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const token = authHeader.split(" ")[1];

    // Decode JWT
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
        { status: 401, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Parse file
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ ok: false, error: "Expected multipart upload" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return new Response(
        JSON.stringify({ ok: false, error: "No file provided" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Upload to R2
    const key = `users/${userId}/${crypto.randomUUID()}-${file.name}`;
    try {
      await env.MY_BUCKET.put(key, file.stream(), {
        httpMetadata: { contentType: file.type },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: "R2 upload failed: " + err.message }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Insert metadata into Supabase
    try {
      const supabaseRes = await fetch(`${env.SUPABASE_URL}/rest/v1/images`, {
        method: "POST",
        headers: {
          "apikey": env.SUPABASE_SERVICE_ROLE_KEY,
          "Authorization": `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          user_uid: userId,
          name: file.name,
          image_size: file.size,
        }),
      });

      if (!supabaseRes.ok) {
        const text = await supabaseRes.text();
        return new Response(
          JSON.stringify({ ok: false, error: "Supabase insert failed: " + text }),
          { status: supabaseRes.status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }
    } catch (err) {
      return new Response(
        JSON.stringify({ ok: false, error: "Supabase insert exception: " + err.message }),
        { status: 500, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    // Success
    return new Response(
      JSON.stringify({ ok: true, key, size: file.size }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  },
};

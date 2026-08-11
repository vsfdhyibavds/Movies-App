import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_BASE = "https://image.tmdb.org";
const API_KEY = "3fd2be6f0c70a2a598f084ddfb75487c";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/tmdb-proxy/, "");

    // Image proxy: /tmdb-proxy/img/t/p/w1280/<path>
    if (path.startsWith("/img/")) {
      const imgPath = path.replace(/^\/img/, "");
      const imgUrl = `${TMDB_IMG_BASE}${imgPath}`;
      const imgRes = await fetch(imgUrl);
      if (!imgRes.ok) {
        return new Response("Image fetch failed", {
          status: imgRes.status,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }
      const contentType = imgRes.headers.get("Content-Type") || "image/jpeg";
      return new Response(imgRes.body, {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": contentType, "Cache-Control": "public, max-age=86400" },
      });
    }

    // JSON API proxy
    const queryParams = new URLSearchParams(url.search);
    if (!queryParams.has("api_key")) {
      queryParams.set("api_key", API_KEY);
    }

    const tmdbUrl = `${TMDB_BASE}${path}?${queryParams.toString()}`;
    const response = await fetch(tmdbUrl, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `TMDB request failed (${response.status})` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

/* eslint-disable @typescript-eslint/no-explicit-any */
// // Follow this setup guide to integrate the Deno language server with your editor:
// // https://deno.land/manual/getting_started/setup_your_environment
// // This enables autocomplete, go to definition, etc.

// // Setup type definitions for built-in Supabase Runtime APIs
// import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// console.log("Hello from Functions!")

// Deno.serve(async (req) => {
//   const { name } = await req.json()
//   const data = {
//     message: `Hello ${name}!`,
//   }

//   return new Response(
//     JSON.stringify(data),
//     { headers: { "Content-Type": "application/json" } },
//   )
// })

// /* To invoke locally:

//   1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
//   2. Make an HTTP request:

//   curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/fetch-title' \
//     --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//     --header 'Content-Type: application/json' \
//     --data '{"name":"Functions"}'

// */

// important not remove the comment. npx supabase functions deploy fetch-title --no-verify-jwt .for deployment of this function on supabase

// supabase/functions/fetchTitle/index.ts
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { serve } from "https://deno.land/std@0.203.0/http/mod.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
};

function ensureUrl(u: string) {
  if (!u) return null;
  if (!/^[a-zA-Z]+:\/\//.test(u)) return "https://" + u;
  return u;
}

async function safeFetch(url: string, timeoutMs = 2000) {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => {
      controller.abort();
      console.error(`Fetch timeout after ${timeoutMs}ms for URL: ${url}`);
    }, timeoutMs);

    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      },
    });

    clearTimeout(id);

    if (!res.ok) {
      console.error("Non-200 response:", res.status, "for URL:", url);
      return null;
    }

    const html = await res.text();
    return html;
  } catch (err) {
    console.error("Fetch error or timeout:", err, "for URL:", url);
    return null;
  }
}

serve(async (req) => {
  try {
    // Handle preflight request
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 200, headers: CORS_HEADERS });
    }

    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Only POST requests allowed" }),
        { status: 405, headers: CORS_HEADERS }
      );
    }

    const body = await req.json().catch(() => ({}));
    const urlRaw = (body?.url || "").toString().trim();
    if (!urlRaw)
      return new Response(JSON.stringify({ error: "missing url" }), {
        status: 400,
        headers: CORS_HEADERS,
      });

    const url = ensureUrl(urlRaw);
    if (!url)
      return new Response(JSON.stringify({ error: "invalid url" }), {
        status: 400,
        headers: CORS_HEADERS,
      });

    const html = await safeFetch(url);

    let title: string | null = null;

    if (!html) {
      console.log("Using fallback title as fetch failed or timed out for URL:", url);
      title = url;
    } else if (/youtube\.com|youtu\.be/.test(url)) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
        const oembedRes = await fetch(oembedUrl);
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          if (oembedData?.title) {
            title = oembedData.title;
            console.log("Fetched YouTube title via oEmbed:", title);
          } else {
            title = url;
          }
        } else {
          title = url;
        }
      } catch (err) {
        console.error("YouTube oEmbed fetch failed:", err);
        title = url;
      }
    } else {
      try {
        // Use Microlink API for non-YouTube dynamic pages
        try {
          const microlinkRes = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
          if (microlinkRes.ok) {
            const microlinkData = await microlinkRes.json();
            if (microlinkData?.data?.title) {
              title = microlinkData.data.title;
              console.log("Fetched title via Microlink:", title);
            }
          }
        } catch (microlinkErr) {
          console.warn("Microlink fetch failed:", microlinkErr);
        }

        // Fallback to <title> tag if title is still null
        if (!title) {
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            title = titleMatch[1];
            console.log("Extracted title:", title, "from URL:", url);
          } else {
            // Fallback to meta tags
            const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["'][^>]*>/i);
            const twitterTitleMatch = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["'][^>]*>/i);
            const ogSiteNameMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["'][^>]*>/i);
            const ogDescriptionMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["'][^>]*>/i);

            if (ogTitleMatch && ogTitleMatch[1]) {
              title = ogTitleMatch[1].trim();
            } else if (twitterTitleMatch && twitterTitleMatch[1]) {
              title = twitterTitleMatch[1].trim();
            } else if (ogSiteNameMatch && ogSiteNameMatch[1]) {
              title = ogSiteNameMatch[1].trim();
            } else if (ogDescriptionMatch && ogDescriptionMatch[1]) {
              title = ogDescriptionMatch[1].trim();
            } else {
              title = url;
            }
          }
        }
      } catch (parseErr) {
        console.error("Error parsing title:", parseErr);
        title = url;
      }
    }

    return new Response(JSON.stringify({ title }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err: any) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: String(err?.message || err) }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
});
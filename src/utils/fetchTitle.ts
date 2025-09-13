/* eslint-disable @typescript-eslint/no-explicit-any */
// src/utils/fetchTitle.ts
import { supabase } from "../supabaseClient";

export async function fetchPageTitle(url: string): Promise<string | null> {
  console.log("fetchPageTitle called with URL:", url);

  try {
    const res = await supabase.functions.invoke("fetch-title", {
      body: JSON.stringify({ url }),
    });

    console.log("Supabase function response:", res);

    // Handle different response structures
    let data: any = null;

    if ("data" in res && res.data) {
      try {
        data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
      } catch (parseErr) {
        console.error("Failed to parse res.data for URL:", url, parseErr);
        return null;
      }
    } else if ("body" in res && res.body) {
      try {
        data = typeof res.body === "string" ? JSON.parse(res.body) : res.body;
      } catch (parseErr) {
        console.error("Failed to parse response body for URL:", url, parseErr);
        return null;
      }
    } else if (res instanceof Response) {
      data = await res.json().catch((e) => {
        console.error("Failed to parse Response JSON for URL:", url, e);
        return null;
      });
    }

    if (data?.title && data.title.trim()) {
      const cleanTitle = data.title.trim();
      return cleanTitle;
    }
    console.warn("No title found in response for URL:", url);
    return null;
  } catch (err) {
    console.warn("fetchPageTitle failed for URL:", url, err);
    return null;
  }
}

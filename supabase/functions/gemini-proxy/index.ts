// supabase/functions/gemini-proxy/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// This is the CORS handler that allows your frontend to call this function.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle preflight CORS requests.
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Get the user's prompt from the request body.
    const { promptText } = await req.json();

    // 2. Securely get your Gemini API key from Supabase secrets.
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not set in Supabase secrets.");
    }

    // 3. Make the secure, server-side call to the Gemini API.
    const googleApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;

    const googleApiResponse = await fetch(googleApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: promptText }] }],
      }),
    });

    if (!googleApiResponse.ok) {
      const errorBody = await googleApiResponse.text();
      throw new Error(`Google API request failed: ${errorBody}`);
    }

    const data = await googleApiResponse.json();

    // 4. Return the response from Google back to your frontend.
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
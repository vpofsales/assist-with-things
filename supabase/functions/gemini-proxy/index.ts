// supabase/functions/gemini-proxy/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

// Define CORS headers to allow requests from any origin.
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Securely get the GEMINI_API_KEY from Supabase secrets
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        // Securely get Oxylabs API credentials from Supabase secrets
        const oxylabsApiUsername = Deno.env.get('OXYLABS_API_USERNAME');
        const oxylabsApiPassword = Deno.env.get('OXYLABS_API_PASSWORD');

        if (!geminiApiKey) {
            return new Response(
                JSON.stringify({ error: 'GEMINI_API_KEY is not set in environment variables.' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }
        if (!oxylabsApiUsername || !oxylabsApiPassword) {
            return new Response(
                JSON.stringify({ error: 'OXYLABS_API_USERNAME or OXYLABS_API_PASSWORD is not set.' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        const { promptText } = await req.json();

        if (!promptText) {
            return new Response(
                JSON.stringify({ error: 'promptText is missing in the request body.' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        // --- Step 1: Use Gemini to refine the search query (if needed) ---
        // We'll keep a small Gemini call here to extract a concise search term
        // for Oxylabs from the user's broader prompt.
        const geminiTriagePrompt = `
            Given the user's refined search query: "${promptText}", extract the most concise and effective product search term suitable for a direct e-commerce search API.
            Focus on the core product and key attributes.
            Example 1: "small blue lava lamp under $50 for my desk" -> "small blue lava lamp"
            Example 2: "gaming headset with noise cancellation" -> "gaming headset noise cancellation"
            Respond with ONLY the search term as plain text.
        `;
        const extractedSearchQuery = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: geminiTriagePrompt }] }] }),
            }
        ).then(res => res.json())
         .then(data => data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || promptText); // Fallback to original promptText

        console.log('Extracted search query for Oxylabs:', extractedSearchQuery);

        // --- Step 2: Call Oxylabs Web Scraper API for actual product data ---
        const oxylabsApiUrl = 'https://realtime.oxylabs.io/v1/queries';
        const basicAuth = btoa(`${oxylabsApiUsername}:${oxylabsApiPassword}`); // Base64 encode credentials

        const oxylabsRequestBody = {
            source: 'amazon_search', // You can change this to 'walmart_search', 'google_shopping', etc.
                                    // based on what's available and what you want to demo.
                                    // 'amazon_search' is a good starting point for detailed product data.
            query: extractedSearchQuery,
            geo_location: 'United States', // Optional: customize location
            render: 'html', // Render JavaScript on the page if needed (important for modern sites)
            parse: true, // Request parsed structured data in the response
        };

        const oxylabsResponse = await fetch(oxylabsApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${basicAuth}`,
            },
            body: JSON.stringify(oxylabsRequestBody),
        });

        if (!oxylabsResponse.ok) {
            const errorData = await oxylabsResponse.json();
            console.error('Oxylabs API Error:', errorData);
            return new Response(
                JSON.stringify({ error: 'Failed to get products from Oxylabs API', details: errorData }),
                {
                    status: oxylabsResponse.status,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        const oxylabsData = await oxylabsResponse.json();
        console.log('Oxylabs Raw Response:', JSON.stringify(oxylabsData, null, 2));

        // Oxylabs response structure can vary based on the 'source'.
        // We need to parse it into the frontend's expected Product[] format.
        // This is a basic example; you might need to adjust based on actual Oxylabs output.
        const products: Product[] = [];
        const filterableAttributes: FilterableAttribute[] = [
            { name: "Price", unit: "$" },
            // Add other attributes you can consistently extract from Oxylabs results
        ];

        // Assuming Oxylabs returns a 'content' field with parsed results, e.g., 'products' array
        if (oxylabsData.content && oxylabsData.content.results && oxylabsData.content.results.length > 0) {
            for (const item of oxylabsData.content.results) {
                // Adjust property names based on actual Oxylabs structured data
                products.push({
                    name: item.title || 'N/A',
                    brand: item.brand || 'Generic',
                    description: item.description || item.snippet || 'No description available.',
                    price: item.price ? parseFloat(item.price.replace(/[^0-9.-]+/g,"")) : 0, // Clean price string
                    specs: [], // Oxylabs might not always provide structured specs directly, or it's nested
                    imageUrl: item.image || `https://placehold.co/400x400/CCCCCC/000000?text=${encodeURIComponent(item.title || 'Product')}`,
                    productUrl: item.url || '#', // This will be the actual product URL!
                });
            }
        } else {
            console.warn('Oxylabs returned no products or unexpected structure.');
        }

        if (products.length === 0) {
            // Fallback if Oxylabs returns no results or fails to parse
            return new Response(
                JSON.stringify({
                    products: [],
                    filterableAttributes: [],
                    message: "No live products found for that query, try being more general."
                }),
                {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        return new Response(JSON.stringify({ products, filterableAttributes }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Edge Function Internal Error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error processing request', details: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});

// Define types for better readability and structure validation
// These should match the interfaces in your frontend's useShoppingAssistant.ts
interface Product {
    name: string;
    brand: string;
    description: string;
    price: number;
    specs: { feature: string; explanation: string }[];
    imageUrl?: string;
    productUrl?: string;
}

interface FilterableAttribute {
    name: string;
    unit?: string;
}

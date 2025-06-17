
// supabase/functions/gemini-proxy/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log('--- Function Invoked ---');
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
        const oxylabsApiUsername = Deno.env.get('OXYLABS_API_USERNAME');
        const oxylabsApiPassword = Deno.env.get('OXYLABS_API_PASSWORD');

        if (!geminiApiKey) {
            console.error('GEMINI_API_KEY not set.');
            return new Response(
                JSON.stringify({ error: 'GEMINI_API_KEY is not set in environment variables.' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }
        if (!oxylabsApiUsername || !oxylabsApiPassword) {
            console.error('OXYLABS_API_USERNAME or OXYLABS_API_PASSWORD not set.');
            return new Response(
                JSON.stringify({ error: 'OXYLABS_API_USERNAME or OXYLABS_API_PASSWORD is not set.' }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        const requestBody = await req.json();
        const { promptText } = requestBody;

        console.log('Received promptText:', promptText);

        if (!promptText) {
            console.error('promptText is missing.');
            return new Response(
                JSON.stringify({ error: 'promptText is missing in the request body.' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        // Check if this is a product search request or a conversation triage request
        const isProductSearch = promptText.includes('Amazon search') || promptText.includes('search query');

        if (isProductSearch) {
            // --- Product Search Flow ---
            console.log('Processing product search request');

            // Extract search query using Gemini
            const geminiTriagePrompt = `
                Given the user's search query: "${promptText}", extract the most concise and effective product search term suitable for a direct e-commerce search API.
                Focus on the core product and key attributes.
                Example 1: "small blue lava lamp under $50 for my desk" -> "small blue lava lamp"
                Example 2: "gaming headset with noise cancellation" -> "gaming headset noise cancellation"
                Example 3: "cheap ergonomic office chair" -> "ergonomic office chair"
                Respond with ONLY the search term as plain text.
            `;
            
            let extractedSearchQuery: string;
            try {
                const geminiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: geminiTriagePrompt }] }] }),
                    }
                );
                
                if (!geminiResponse.ok) {
                    const rawErrorText = await geminiResponse.text();
                    console.error('Gemini API returned non-OK status:', geminiResponse.status, rawErrorText);
                    throw new Error(`Gemini API error: ${rawErrorText}`);
                }

                const geminiData = await geminiResponse.json();
                extractedSearchQuery = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || promptText;
            } catch (geminiError: any) {
                console.error('Error calling Gemini for triage:', geminiError.message);
                extractedSearchQuery = promptText; // Fallback
            }

            console.log('Extracted search query for Oxylabs:', extractedSearchQuery);

            // Call Oxylabs for product data
            const oxylabsApiUrl = 'https://realtime.oxylabs.io/v1/queries';
            const basicAuth = btoa(`${oxylabsApiUsername}:${oxylabsApiPassword}`);

            const oxylabsRequestBody = {
                source: 'amazon_search',
                query: extractedSearchQuery,
                geo_location: 'United States',
                render: 'html',
                parse: true,
            };

            console.log('Sending request to Oxylabs with body:', JSON.stringify(oxylabsRequestBody, null, 2));

            const oxylabsResponse = await fetch(oxylabsApiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${basicAuth}`,
                },
                body: JSON.stringify(oxylabsRequestBody),
            });

            console.log('Received response status from Oxylabs:', oxylabsResponse.status);

            if (!oxylabsResponse.ok) {
                const errorData = await oxylabsResponse.json().catch(() => ({ message: 'Could not parse Oxylabs error response.' }));
                console.error('Oxylabs API returned non-OK status:', oxylabsResponse.status, errorData);
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

            const products: Product[] = [];
            const filterableAttributes: FilterableAttribute[] = [
                { name: "Price", unit: "$" },
            ];

            if (oxylabsData.content && oxylabsData.content.results && oxylabsData.content.results.length > 0) {
                for (const item of oxylabsData.content.results) {
                    products.push({
                        name: item.title || 'N/A',
                        brand: item.brand || 'Generic',
                        description: item.description || item.snippet || 'No description available.',
                        price: item.price ? parseFloat(item.price.replace(/[^0-9.-]+/g,"")) : 0,
                        specs: [],
                        imageUrl: item.image || `https://placehold.co/400x400/CCCCCC/000000?text=${encodeURIComponent(item.title || 'Product')}`,
                        productUrl: item.url || '#',
                    });
                }
            } else {
                console.warn('Oxylabs returned no products or unexpected structure. Defaulting to empty array.');
            }

            if (products.length === 0) {
                return new Response(
                    JSON.stringify({
                        products: [],
                        filterableAttributes: [],
                        message: "No live products found for that query, try being more general or checking your Oxylabs account."
                    }),
                    {
                        status: 200,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    }
                );
            }
            
            console.log('Successfully prepared products for frontend.');
            return new Response(JSON.stringify({ products, filterableAttributes }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });

        } else {
            // --- Conversation Triage Flow ---
            console.log('Processing conversation triage request');

            const geminiResponse = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: promptText }] }] }),
                }
            );

            if (!geminiResponse.ok) {
                const rawErrorText = await geminiResponse.text();
                console.error('Gemini API returned non-OK status:', geminiResponse.status, rawErrorText);
                throw new Error(`Gemini API error: ${rawErrorText}`);
            }

            const geminiData = await geminiResponse.json();
            
            // Return the full Gemini response for conversation handling
            return new Response(JSON.stringify(geminiData), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

    } catch (error: any) {
        console.error('Edge Function top-level catch error:', error.message, error.stack);
        return new Response(
            JSON.stringify({ error: 'Internal server error processing request', details: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});

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

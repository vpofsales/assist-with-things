// src/hooks/useShoppingAssistant.ts

import { useState, useCallback, useMemo } from 'react';

// ... (keep the interface definitions for Message, Product, etc., as they are)
interface Message {
  role: 'user' | 'model';
  parts: { text: string }[];
}

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

interface Filters {
  brand: string;
  sortBy: string;
  advanced: Record<string, number>;
}

interface ModalState {
  isOpen: boolean;
  title: string;
  content: string;
  isLoading: boolean;
}

const INITIAL_MESSAGE: Message = {
  role: "model",
  parts: [{ text: "Hello! I can find real products for you. To get started, you can tell me what you're looking for, or just say \"help me shop\" and I can guide you!" }]
};

export function useShoppingAssistant() {
  const [conversationHistory, setConversationHistory] = useState<Message[]>([INITIAL_MESSAGE]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [comparisonList, setComparisonList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Working, hang tight...");
  const [filterableAttributes, setFilterableAttributes] = useState<FilterableAttribute[]>([]);
  const [filters, setFilters] = useState<Filters>({ brand: 'all', sortBy: 'default', advanced: {} });
  const [modalState, setModalState] = useState<ModalState>({ isOpen: false, title: '', content: '', isLoading: false });

  // This function now calls YOUR secure backend, not Google's.
  const callGemini = async (prompt: string, isJson = false): Promise<any> => {
    // !!! IMPORTANT: Replace this with your actual Supabase Edge Function URL !!!
    const supabaseFunctionUrl = 'https://arecopcgvzzttgqqsvhp.supabase.co/functions/v1/gemini-proxy';
    
    try {
      const response = await fetch(
        supabaseFunctionUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promptText: prompt })
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "The AI model had an issue with that request. Please try again.");
      }

      const result = await response.json();
      
      if (isJson) {
        return result;
      }

      // For non-JSON responses, expect text content
      if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        return result.candidates[0].content.parts[0].text;
      }
      
      throw new Error("Received an empty or invalid response from the AI model.");
    } catch (error) {
      console.error("Error calling Supabase function:", error);
      throw error;
    }
  };

  // No changes needed below this line, the logic remains the same.
  const determineNextAction = async (userText: string, history: Message[]) => {
    const triagePrompt = `
      You are the brain of a proactive, intelligent AI Shopping Assistant. Your goal is to guide the user from a vague idea to a concrete product search in a friendly, human-like manner.
      You should ask a **maximum of 3-4 clarifying questions** before attempting a search, even if the details are not exhaustive. After 3-4 clarifying questions, prioritize initiating a search to provide results, and then offer refinement options afterwards.
      Analyze the user's latest request based on the provided conversation history and decide the single best next action.
      **Conversation History (Last 5 messages):** ${JSON.stringify(history.slice(-5))}
      **User's Latest Request:** "${userText}"
      ---
      **Step-by-Step Decision Logic:**
      1. Is this a very vague, initial request? (e.g., "help me shop", "i need tech"). Action: \`identify_persona\`.
      2. Did you just ask for a persona and the user replied with one? (e.g., "I'm a gamer", "student"). Action: \`suggest_categories\`.
      3. Did you just suggest categories and the user picked one? Action: \`search\`.
      4. **Is there a clear product type identified (e.g., "lamp", "lava lamp") AND at least two distinct, concrete search criteria provided (e.g., "small blue", "under $50", "for desk", "modern style")? If yes, it's definitively time to search with these details. Action: \`search\`.**
      5. **Has the conversation already involved 3 or more rounds of clarifying questions, and a clear product type is identified? If so, it's time to proceed with a search using the *best available information*, even if it's not perfect or all details are not specified. Prioritize getting products in front of the user. Action: \`search\`.**
      6. If none of the above, is more detail truly needed? Action: \`clarify\`. Ask a single, precise, *next logical question* to get crucial missing information. Do NOT ask more than one question per turn.
      ---
      **Response Format:** Respond with ONLY a single, valid JSON object in one of these formats:
      * \`{ "action": "identify_persona", "question": "I can definitely help! To get started, what's the primary purpose? For example, are you a 'Gamer', a 'Student', a 'Remote Worker', or maybe 'Setting up a smart home'?" }\`
      * \`{ "action": "suggest_categories", "persona": "EXTRACTED_PERSONA_HERE" }\`
      * \`{ "action": "clarify", "question": "YOUR_CLARIFYING_QUESTION_HERE" }\`
      * \`{ "action": "search", "query": "YOUR_CONCISE_SEARCH_QUERY_HERE" }\`
    `;
    return await callGemini(triagePrompt, true);
  };

  const generateCategorySuggestions = async (persona: string) => {
    const suggestionPrompt = `
      You are a helpful shopping assistant. A user has identified as a "${persona}".
      Suggest 4-5 relevant product categories they might be interested in.
      Format your response as a friendly, conversational sentence with a question at the end.
      Example for "Gamer": "Awesome! Gamers often look for items like High-Refresh-Rate Monitors, Mechanical Keyboards, Gaming Mice, or Noise-Cancelling Headsets. Do any of those sound like what you're looking for today?"
    `;
    return await callGemini(suggestionPrompt);
  };

  // This function calls the Supabase Edge Function for product searches
  const searchWebForProducts = async (searchQuery: string) => {
    const supabaseFunctionUrl = 'https://arecopcgvzzttgqqsvhp.supabase.co/functions/v1/gemini-proxy';
    
    try {
      const response = await fetch(supabaseFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promptText: searchQuery })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to search for products. Please try again.");
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error calling Supabase function:", error);
      throw error;
    }
  };

  const searchWebForReviews = async (productName: string) => {
    const reviewPrompt = `You are a review aggregator. Write a detailed review summary for the product "${productName}". Include a "Pros" and a "Cons" section, each with 3-4 bullet points. Use markdown for formatting.`;
    return await callGemini(reviewPrompt);
  };

  const markdownToHtml = (md: string): string => {
    let html = md;
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code class="block whitespace-pre-wrap p-4 rounded-md bg-gray-800">$1</code></pre>');
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-700 rounded-sm px-1 py-0.5 text-sm font-mono">$1</code>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold mt-4 mb-2">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-6 mb-3 border-b border-gray-600 pb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4 border-b-2 border-gray-500 pb-3">$1</h1>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/^\s*[-*+] (.*)/gim, '<li>$1</li>');
    html = html.replace(/((<li>.*<\/li>\s*)+)/gim, '<ul class="list-disc list-inside space-y-2 my-4 pl-4">$1</ul>');
    html = html.replace(/\n/g, '<br>');
    html = html.replace(/<br><br>/g, '<p></p>');
    return html;
  };

  const handleSendMessage = useCallback(async (userText: string) => {
    const newHistory = [...conversationHistory, { role: "user" as const, parts: [{ text: userText }] }];
    setConversationHistory(newHistory);
    
    setIsLoading(true);
    setLoadingText("Thinking...");
    
    try {
      const decision = await determineNextAction(userText, newHistory);
      
      if (decision.action === "identify_persona" || decision.action === "clarify") {
        setIsLoading(false);
        setConversationHistory(prev => [...prev, { role: "model", parts: [{ text: decision.question }] }]);
      } else if (decision.action === "suggest_categories") {
        setLoadingText("Coming up with ideas...");
        const suggestionText = await generateCategorySuggestions(decision.persona);
        setIsLoading(false);
        setConversationHistory(prev => [...prev, { role: "model", parts: [{ text: suggestionText }] }]);
      } else if (decision.action === "search") {
        setLoadingText(`Searching for: "${decision.query}"`);
        const { products, filterableAttributes } = await searchWebForProducts(decision.query);
        setIsLoading(false);
        
        if (products && products.length > 0) {
          const botResponse = `I found some products based on your request for "${decision.query}". Check them out!`;
          setConversationHistory(prev => [...prev, { role: "model", parts: [{ text: botResponse }] }]);
          setAllProducts(products);
          setFilterableAttributes(filterableAttributes || []);
          setFilters({ brand: 'all', sortBy: 'default', advanced: {} });
        } else {
          throw new Error("No products found. Please try a different search.");
        }
      } else {
        throw new Error("The AI returned an unexpected action. Please try again.");
      }
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : "Sorry, I had trouble with that request. Could you try rephrasing?";
      setConversationHistory(prev => [...prev, { role: "model", parts: [{ text: errorMessage }] }]);
    }
  }, [conversationHistory]);

  const handleShowReviews = useCallback(async (productName: string) => {
    setModalState({ isOpen: true, title: "Review Summary", content: "", isLoading: true });
    
    try {
      const summary = await searchWebForReviews(productName);
      setModalState(prev => ({ ...prev, content: markdownToHtml(summary), isLoading: false }));
    } catch (error) {
      console.error("Error getting reviews:", error);
      setModalState(prev => ({ 
        ...prev, 
        content: "<p>Sorry, I couldn't fetch the reviews for this product right now.</p>", 
        isLoading: false 
      }));
    }
  }, []);

  const generateComparison = useCallback(async () => {
    if (comparisonList.length < 2) return;
    
    setModalState({ isOpen: true, title: "Product Comparison", content: "", isLoading: true });
    
    const productsToCompare = allProducts.filter(p => comparisonList.includes(p.name));
    
    try {
      const productDetails = JSON.stringify(productsToCompare.map(p => ({
        name: p.name,
        specs: p.specs.map(s => s.feature),
        price: p.price
      })));
      const prompt = `You are a tech comparison expert. A user wants to compare the following products: ${productDetails}. Provide a detailed, unbiased comparison in markdown. Start with a summary of which product is best for what type of user. Then, create a comparison table. Finally, provide a "Final Verdict" paragraph.`;
      const comparisonText = await callGemini(prompt);
      
      setModalState(prev => ({ ...prev, content: markdownToHtml(comparisonText), isLoading: false }));
    } catch (error) {
      console.error("Error generating comparison:", error);
      setModalState(prev => ({ 
        ...prev, 
        content: "Sorry, there was an error generating the comparison.", 
        isLoading: false 
      }));
    }
  }, [comparisonList, allProducts]);

  const updateFilters = useCallback((newFilters: Partial<Filters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const updateComparisonList = useCallback((productName: string, isChecked: boolean) => {
    setComparisonList(prev => 
      isChecked 
        ? [...prev, productName]
        : prev.filter(name => name !== productName)
    );
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = [...allProducts];
    
    if (filters.brand !== 'all') {
      filtered = filtered.filter(p => p.brand === filters.brand);
    }
    
    Object.entries(filters.advanced).forEach(([attrName, minVal]) => {
      filtered = filtered.filter(p => {
        const spec = p.specs.find(s => 
          s.feature && s.feature.toLowerCase().includes(attrName.toLowerCase())
        );
        if (!spec || !spec.feature) return false;
        const match = spec.feature.match(/(\d+(\.\d+)?)/);
        if (!match) return false;
        return parseFloat(match[0]) >= minVal;
      });
    });
    
    if (filters.sortBy === 'price-asc') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === 'price-desc') {
      filtered.sort((a, b) => b.price - a.price);
    }
    
    return filtered;
  }, [allProducts, filters]);

  return {
    conversationHistory,
    allProducts,
    comparisonList,
    isLoading,
    loadingText,
    filterableAttributes,
    filteredProducts,
    filters,
    modalState,
    handleSendMessage,
    handleShowReviews,
    generateComparison,
    updateFilters,
    updateComparisonList,
    setModalState
  };
}

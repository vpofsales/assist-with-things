
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ChatInterface from '@/components/shopping/ChatInterface';
import ProductGrid from '@/components/shopping/ProductGrid';
import ProductFilters from '@/components/shopping/ProductFilters';
import LoadingIndicator from '@/components/shopping/LoadingIndicator';
import { useShoppingAssistant } from '@/hooks/useShoppingAssistant';
import { MoreHorizontal, Search, Key } from 'lucide-react';

const ShoppingAssistant = () => {
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(true);
  
  const {
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
    setModalState,
    setApiKey: setShoppingApiKey
  } = useShoppingAssistant();

  const [userInput, setUserInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleApiKeySubmit = () => {
    if (apiKey.trim()) {
      setShoppingApiKey(apiKey.trim());
      setShowApiKeyInput(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim()) {
      handleSendMessage(userInput.trim());
      setUserInput('');
    }
  };

  useEffect(() => {
    if (allProducts.length > 0) {
      setShowFilters(true);
    }
  }, [allProducts]);

  if (showApiKeyInput) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <Key className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">API Key Required</h1>
            <p className="text-gray-400">Enter your Google Gemini API key to use the AI Shopping Assistant</p>
          </div>
          
          <Alert className="mb-4 bg-gray-700 border-gray-600">
            <AlertDescription className="text-gray-300">
              Get your free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Google AI Studio</a>
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter your Gemini API key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleApiKeySubmit();
                }
              }}
            />
            <Button 
              onClick={handleApiKeySubmit}
              disabled={!apiKey.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              Start Shopping
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gray-900 text-white">
      {/* Chat Interface */}
      <div className="w-full md:w-1/3 lg:w-2/5 xl:w-1/3 h-2/5 md:h-full flex flex-col bg-gray-900 border-r border-gray-700/50">
        <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center">
            <MoreHorizontal className="h-8 w-8 text-indigo-400 mr-3" />
            <h1 className="text-xl font-semibold tracking-wide">AI Shopping Assistant</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowApiKeyInput(true)}
            className="text-gray-400 hover:text-white"
          >
            <Key className="h-4 w-4" />
          </Button>
        </div>
        
        <ChatInterface 
          conversationHistory={conversationHistory}
          className="flex-1"
        />
        
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700/50 flex bg-gray-900/50 backdrop-blur-sm">
          <Input
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="flex-1 bg-gray-800 text-white rounded-l-lg border-gray-700 focus:ring-indigo-500"
            placeholder="Describe what you need..."
          />
          <Button 
            type="submit" 
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-r-lg rounded-l-none"
          >
            Send
          </Button>
        </form>
      </div>

      {/* Product Results */}
      <div className="w-full md:w-2/3 lg:w-3/5 xl:w-2/3 h-3/5 md:h-full flex flex-col bg-gray-800">
        <div className="p-4 border-b border-gray-700/50 sticky top-0 bg-gray-800/80 backdrop-blur-sm z-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Suggested Products</h2>
              <p className="text-sm text-gray-400">AI recommendations based on your request</p>
            </div>
            
            {showFilters && (
              <ProductFilters
                products={allProducts}
                filterableAttributes={filterableAttributes}
                filters={filters}
                comparisonList={comparisonList}
                onFiltersChange={updateFilters}
                onCompare={generateComparison}
              />
            )}
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {isLoading ? (
            <LoadingIndicator text={loadingText} />
          ) : allProducts.length > 0 ? (
            <ProductGrid
              products={filteredProducts}
              comparisonList={comparisonList}
              onShowReviews={handleShowReviews}
              onUpdateComparison={updateComparisonList}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Search className="mx-auto h-16 w-16 text-gray-600" />
                <p className="mt-4 text-lg">Your search results will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Dialog open={modalState.isOpen} onOpenChange={(open) => setModalState({ ...modalState, isOpen: open })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">{modalState.title}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-invert max-w-none text-gray-300">
            {modalState.isLoading ? (
              <div className="text-center p-8">
                <div className="animate-spin mx-auto h-8 w-8 border-4 border-indigo-400 border-t-transparent rounded-full"></div>
                <p className="mt-4">AI is working...</p>
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: modalState.content }} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShoppingAssistant;

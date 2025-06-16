// src/pages/ShoppingAssistant.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ChatInterface from '@/components/shopping/ChatInterface';
import ProductGrid from '@/components/shopping/ProductGrid';
import ProductFilters from '@/components/shopping/ProductFilters';
import LoadingIndicator from '@/components/shopping/LoadingIndicator';
import { useShoppingAssistant } from '@/hooks/useShoppingAssistant';
import { MoreHorizontal, Search } from 'lucide-react';

const ShoppingAssistant = () => {
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
  } = useShoppingAssistant();

  const [userInput, setUserInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gray-900 text-white">
      {/* Chat Interface */}
      <div className="w-full md:w-1/3 lg:w-2/5 xl:w-1/3 h-2/5 md:h-full flex flex-col bg-gray-900 border-r border-gray-700/50">
        <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
          <div className="flex items-center">
            <MoreHorizontal className="h-8 w-8 text-indigo-400 mr-3" />
            <h1 className="text-xl font-semibold tracking-wide">AI Shopping Assistant</h1>
          </div>
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
            disabled={isLoading}
          />
          <Button 
            type="submit" 
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 rounded-r-lg rounded-l-none"
            disabled={isLoading}
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
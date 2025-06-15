
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ShoppingBag, Bot, Search, Zap } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="text-center max-w-4xl mx-auto px-6">
        <div className="mb-8">
          <Bot className="h-16 w-16 text-indigo-400 mx-auto mb-4" />
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            AI Shopping Assistant
          </h1>
          <p className="text-xl text-gray-400 mb-8 leading-relaxed max-w-2xl mx-auto">
            Discover the perfect products with the power of AI. Get personalized recommendations, 
            compare features, and make informed decisions effortlessly.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <Search className="h-8 w-8 text-indigo-400 mb-4 mx-auto" />
            <h3 className="text-lg font-semibold text-white mb-2">Smart Search</h3>
            <p className="text-gray-400 text-sm">
              Describe what you need in natural language and get targeted product recommendations
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <Zap className="h-8 w-8 text-indigo-400 mb-4 mx-auto" />
            <h3 className="text-lg font-semibold text-white mb-2">Instant Comparison</h3>
            <p className="text-gray-400 text-sm">
              Compare multiple products side-by-side with AI-generated analysis and insights
            </p>
          </div>
          
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <ShoppingBag className="h-8 w-8 text-indigo-400 mb-4 mx-auto" />
            <h3 className="text-lg font-semibold text-white mb-2">Personalized Results</h3>
            <p className="text-gray-400 text-sm">
              Get recommendations tailored to your specific needs and preferences
            </p>
          </div>
        </div>

        <Button 
          asChild 
          size="lg" 
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        >
          <Link to="/shopping">
            Start Shopping with AI
          </Link>
        </Button>

        <div className="mt-8 text-sm text-gray-500">
          <p>No account required • Free to use • Powered by AI</p>
        </div>
      </div>
    </div>
  );
};

export default Index;

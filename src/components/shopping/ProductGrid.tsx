
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, ExternalLink } from 'lucide-react';

interface Product {
  name: string;
  brand: string;
  description: string;
  price: number;
  specs: { feature: string; explanation: string }[];
  imageUrl?: string;
  productUrl?: string;
}

interface ProductGridProps {
  products: Product[];
  comparisonList: string[];
  onShowReviews: (productName: string) => void;
  onUpdateComparison: (productName: string, isChecked: boolean) => void;
}

const ProductGrid = ({ products, comparisonList, onShowReviews, onUpdateComparison }: ProductGridProps) => {
  if (!products || products.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <p>No products match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {products.map((product, index) => {
        const encodedName = encodeURIComponent(product.name);
        const placeholderImgUrl = `https://placehold.co/400x400/1f2937/a8b2c2?text=${encodedName}`;
        const isInComparison = comparisonList.includes(product.name);

        return (
          <div key={index} className="bg-gray-800/50 rounded-lg shadow-lg flex flex-col md:flex-row overflow-hidden border border-gray-700 hover:border-gray-600 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <div className="md:w-1/3 flex-shrink-0">
              <img 
                src={product.imageUrl || placeholderImgUrl} 
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = placeholderImgUrl;
                }}
              />
            </div>
            
            <div className="p-5 flex flex-col flex-grow">
              <div className="flex-grow">
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">{product.name}</h3>
                <p className="text-sm text-gray-500 font-medium mb-3">{product.brand}</p>
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">{product.description}</p>
                
                <ul className="space-y-2 mb-4">
                  {product.specs.map((spec, specIndex) => (
                    <li key={specIndex} className="text-gray-400 text-sm flex items-center gap-2">
                      <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span className="relative group cursor-help border-b border-dotted border-gray-600">
                        {spec.feature}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10 pointer-events-none">
                          {spec.explanation}
                        </div>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between items-center mt-auto pt-4 border-t border-gray-700/50 gap-4">
                <p className="text-2xl font-bold text-indigo-400">
                  ${product.price ? product.price.toFixed(2) : 'N/A'}
                </p>
                
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onShowReviews(product.name)}
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    Reviews
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`compare-${index}`}
                      checked={isInComparison}
                      onCheckedChange={(checked) => onUpdateComparison(product.name, !!checked)}
                    />
                    <label htmlFor={`compare-${index}`} className="text-sm cursor-pointer">
                      Compare
                    </label>
                  </div>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    asChild
                    className="bg-gray-700 hover:bg-gray-600"
                  >
                    <a 
                      href={product.productUrl || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1"
                    >
                      View Product
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProductGrid;

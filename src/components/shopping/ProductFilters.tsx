
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

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

interface ProductFiltersProps {
  products: Product[];
  filterableAttributes: FilterableAttribute[];
  filters: Filters;
  comparisonList: string[];
  onFiltersChange: (filters: Partial<Filters>) => void;
  onCompare: () => void;
}

const ProductFilters = ({ 
  products, 
  filterableAttributes, 
  filters, 
  comparisonList, 
  onFiltersChange, 
  onCompare 
}: ProductFiltersProps) => {
  const brands = [...new Set(products.map(p => p.brand))].sort();

  const getAttributeRange = (attrName: string) => {
    const values = products.map(p => {
      const spec = p.specs.find(s => 
        s.feature && s.feature.toLowerCase().includes(attrName.toLowerCase())
      );
      if (!spec || !spec.feature) return null;
      const match = spec.feature.match(/(\d+(\.\d+)?)/);
      return match ? parseFloat(match[0]) : null;
    }).filter(v => v !== null && !isNaN(v));

    if (values.length < 2) return null;
    return { min: Math.min(...values), max: Math.max(...values) };
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <Select value={filters.brand} onValueChange={(value) => onFiltersChange({ brand: value })}>
          <SelectTrigger className="w-[180px] bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600 text-white">
            <SelectItem value="all">All Brands</SelectItem>
            {brands.map(brand => (
              <SelectItem key={brand} value={brand}>{brand}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.sortBy} onValueChange={(value) => onFiltersChange({ sortBy: value })}>
          <SelectTrigger className="w-[180px] bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="Sort By" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600 text-white">
            <SelectItem value="default">Sort By</SelectItem>
            <SelectItem value="price-asc">Price: Low to High</SelectItem>
            <SelectItem value="price-desc">Price: High to Low</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={onCompare}
          disabled={comparisonList.length < 2}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          Compare ({comparisonList.length})
        </Button>
      </div>

      {filterableAttributes.length > 0 && (
        <div className="flex flex-wrap gap-6 items-center pt-2">
          {filterableAttributes.map(attr => {
            const range = getAttributeRange(attr.name);
            if (!range) return null;

            const currentValue = filters.advanced[attr.name] || range.min;

            return (
              <div key={attr.name} className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 font-medium">
                  {attr.name} (min: {range.min}{attr.unit || ''})
                </label>
                <div className="w-36">
                  <Slider
                    value={[currentValue]}
                    onValueChange={([value]) => 
                      onFiltersChange({ 
                        advanced: { ...filters.advanced, [attr.name]: value }
                      })
                    }
                    min={range.min}
                    max={range.max}
                    step={1}
                    className="w-full"
                  />
                </div>
                <span className="text-xs text-center text-gray-300">
                  {currentValue}{attr.unit || ''}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductFilters;

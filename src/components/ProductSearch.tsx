
import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  stock: number;
  prescription_required: boolean;
  image_url?: string;
}

interface ProductSearchProps {
  products: Product[];
  onFilteredProducts: (products: Product[]) => void;
  initialCategory?: string | null;
}

const ProductSearch: React.FC<ProductSearchProps> = ({ 
  products, 
  onFilteredProducts, 
  initialCategory 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || '');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [showPrescriptionOnly, setShowPrescriptionOnly] = useState(false);

  // Get unique categories and brands
  const categories = useMemo(() => {
    const cats = products.map(p => p.category).filter(Boolean);
    return [...new Set(cats)].sort();
  }, [products]);

  const brands = useMemo(() => {
    const brandsSet = products.map(p => p.brand).filter(Boolean);
    return [...new Set(brandsSet)].sort();
  }, [products]);

  // Filter products based on search criteria
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Text search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(term) ||
        product.description?.toLowerCase().includes(term) ||
        product.category?.toLowerCase().includes(term) ||
        product.brand?.toLowerCase().includes(term)
      );
    }

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    // Brand filter
    if (selectedBrand) {
      filtered = filtered.filter(product => product.brand === selectedBrand);
    }

    // Price range filter
    if (priceRange.min) {
      filtered = filtered.filter(product => product.price >= Number(priceRange.min));
    }
    if (priceRange.max) {
      filtered = filtered.filter(product => product.price <= Number(priceRange.max));
    }

    // Prescription filter
    if (showPrescriptionOnly) {
      filtered = filtered.filter(product => product.prescription_required);
    }

    return filtered;
  }, [products, searchTerm, selectedCategory, selectedBrand, priceRange, showPrescriptionOnly]);

  // Update parent component when filters change
  React.useEffect(() => {
    onFilteredProducts(filteredProducts);
  }, [filteredProducts, onFilteredProducts]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedBrand('');
    setPriceRange({ min: '', max: '' });
    setShowPrescriptionOnly(false);
  };

  const hasActiveFilters = searchTerm || selectedCategory || selectedBrand || priceRange.min || priceRange.max || showPrescriptionOnly;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <Input
          type="text"
          placeholder="Search medicines, symptoms, or brands..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('')}
          >
            All Categories
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Brand Filter */}
        {brands.length > 0 && (
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="px-3 py-1 border rounded-md text-sm"
          >
            <option value="">All Brands</option>
            {brands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        )}

        {/* Price Range */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min price"
            value={priceRange.min}
            onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
            className="w-24 text-sm"
          />
          <span className="text-gray-500">-</span>
          <Input
            type="number"
            placeholder="Max price"
            value={priceRange.max}
            onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
            className="w-24 text-sm"
          />
        </div>

        {/* Prescription Filter */}
        <Button
          variant={showPrescriptionOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowPrescriptionOnly(!showPrescriptionOnly)}
        >
          Prescription Only
        </Button>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear Filters
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Active filters:</span>
          {searchTerm && <Badge variant="secondary">Search: {searchTerm}</Badge>}
          {selectedCategory && <Badge variant="secondary">Category: {selectedCategory}</Badge>}
          {selectedBrand && <Badge variant="secondary">Brand: {selectedBrand}</Badge>}
          {priceRange.min && <Badge variant="secondary">Min: KES {priceRange.min}</Badge>}
          {priceRange.max && <Badge variant="secondary">Max: KES {priceRange.max}</Badge>}
          {showPrescriptionOnly && <Badge variant="secondary">Prescription Required</Badge>}
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredProducts.length} of {products.length} products
      </div>
    </div>
  );
};

export default ProductSearch;

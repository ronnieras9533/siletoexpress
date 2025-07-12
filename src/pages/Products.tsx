
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { ShoppingCart, AlertCircle, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductSearch from '@/components/ProductSearch';
import LoginModal from '@/components/LoginModal';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  prescription_required: boolean;
  image_url?: string;
  category: string;
  brand: string;
}

const Products = () => {
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchParams] = useSearchParams();
  const { addToCart, showLoginModal, setShowLoginModal } = useCart();
  const navigate = useNavigate();

  // Get category from URL parameters
  const categoryFilter = searchParams.get('category');

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    }
  });

  useEffect(() => {
    if (products) {
      let filtered = products;
      
      // Apply category filter if present in URL
      if (categoryFilter) {
        filtered = products.filter(product => 
          product.category?.toLowerCase() === categoryFilter.toLowerCase()
        );
      }
      
      setFilteredProducts(filtered);
    }
  }, [products, categoryFilter]);

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      prescription_required: product.prescription_required,
      image_url: product.image_url,
      stock: product.stock
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading products...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-red-600">Error loading products</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {categoryFilter ? `${categoryFilter} Products` : 'All Products'}
          </h1>
          {categoryFilter && (
            <p className="text-gray-600 mb-4">
              Showing products in the {categoryFilter} category
            </p>
          )}
          
          {/* Search and Filter Component */}
          {products && (
            <ProductSearch
              products={products}
              onFilteredProducts={setFilteredProducts}
              initialCategory={categoryFilter}
            />
          )}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts?.map(product => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-2">
                    {product.name}
                  </CardTitle>
                  {product.prescription_required && (
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      <AlertCircle size={14} className="mr-1" />
                      Rx
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-32 object-cover rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                
                <div className={`w-full h-32 bg-gray-100 rounded flex flex-col items-center justify-center ${product.image_url ? 'hidden' : ''}`}>
                  <Package className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-gray-500 text-xs">No image</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-600 line-clamp-3">{product.description}</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-500">{product.brand}</span>
                    <Badge variant="outline">{product.category}</Badge>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">KES {product.price}</p>
                    <p className="text-sm text-gray-500">
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => navigate(`/product/${product.id}`)}
                    variant="outline"
                    className="flex-1"
                    size="sm"
                  >
                    View Details
                  </Button>
                  <Button
                    onClick={() => handleAddToCart(product)}
                    disabled={product.stock === 0}
                    size="sm"
                    className="flex-1"
                  >
                    <ShoppingCart size={16} className="mr-1" />
                    Add to Cart
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">
              {categoryFilter 
                ? `No products found in the ${categoryFilter} category.`
                : 'No products found matching your search.'
              }
            </p>
            {categoryFilter && (
              <Button 
                onClick={() => navigate('/products')} 
                className="mt-4"
              >
                View All Products
              </Button>
            )}
          </div>
        )}
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
      
      <Footer />
    </div>
  );
};

export default Products;

import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ShoppingCart, AlertCircle } from "lucide-react"
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  // Fetch products from Supabase
  const { data: products = [], isLoading, error } = useQuery({
    queryKey: ['products', searchQuery, selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .gt('stock', 0);

      if (searchQuery.trim()) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null);

      if (error) {
        throw error;
      }

      const uniqueCategories = [...new Set(data?.map(item => item.category).filter(Boolean))] as string[];
      return uniqueCategories;
    },
  });

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category === 'all' ? '' : category);
    const newParams = new URLSearchParams(searchParams);
    if (category && category !== 'all') {
      newParams.set('category', category);
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams);
  };

  const handleSearch = () => {
    const newParams = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      newParams.set('search', searchQuery);
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const handleAddToCart = (product: any) => {
    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url,
      prescription_required: product.prescription_required,
      stock: product.stock
    };

    addToCart(cartItem);
    toast({
      title: "Added to cart!",
      description: `${product.name} has been added to your cart.`,
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto py-8 px-4">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error loading products: {error.message}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
          <h1 className="text-2xl font-bold">Products</h1>
          <div className="flex items-center w-full md:w-auto">
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
              className="flex-1 md:max-w-xs"
            />
            <Button onClick={handleSearch} className="ml-2">Search</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="col-span-1">
            <Card className="sticky top-4">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Select 
                  value={selectedCategory || 'all'} 
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
          
          <div className="col-span-1 lg:col-span-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="mr-2 h-8 w-8 animate-spin" />
                <span className="text-lg">Loading products...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No products found matching your criteria.</p>
                <Button onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('');
                  setSearchParams(new URLSearchParams());
                }}>
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {products.map((product) => (
                  <Card key={product.id} className="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                    <CardHeader className="p-3 pb-1">
                      <CardTitle className="line-clamp-2 text-sm font-medium h-10 flex items-center">
                        {product.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 flex flex-col flex-grow">
                      <div className="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden flex-shrink-0">
                        {product.image_url ? (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ShoppingCart size={24} className="opacity-50" />
                          </div>
                        )}
                      </div>
                      
                      <div className="mt-auto">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-blue-600">
                            KES {product.price.toLocaleString()}
                          </span>
                          <Badge variant="secondary" className="text-xs truncate max-w-[70px]">
                            {product.category}
                          </Badge>
                        </div>

                        {product.prescription_required && (
                          <div className="flex items-center gap-1 text-red-600 text-xs mb-2">
                            <AlertCircle size={12} />
                            <span>Prescription Required</span>
                          </div>
                        )}

                        <div className="flex gap-2 mt-2">
                          <Button
                            onClick={() => handleAddToCart(product)}
                            disabled={product.stock === 0}
                            className="flex-1 text-xs px-2 py-1 h-8"
                          >
                            <ShoppingCart size={12} className="mr-1" />
                            Add
                          </Button>
                          
                          <Link to={`/product/${product.id}`} className="flex-1">
                            <Button variant="outline" className="text-xs px-2 py-1 h-8 w-full">
                              View
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Products;

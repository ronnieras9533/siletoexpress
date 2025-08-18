import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const FeaturedProducts = () => {
  const { addToCart } = useCart();
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      console.log('FeaturedProducts: Starting products query');
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gt('stock', 0)
        .eq('prescription_required', false) // Exclude prescription drugs
        .limit(6)
        .order('created_at', { ascending: false });

      console.log('FeaturedProducts: Query result:', { data, error });

      if (error) {
        console.error('FeaturedProducts: Error fetching products:', error);
        throw error;
      }

      console.log(
        `FeaturedProducts: Successfully fetched products: ${data?.length || 0}`
      );
      return data || [];
    },
  });

  const handleAddToCart = (product: any) => {
    const cartItem = {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      image_url: product.image_url,
      prescription_required: product.prescription_required,
      stock: product.stock,
    };

    addToCart(cartItem);
    toast({
      title: 'Added to cart!',
      description: `${product.name} has been added to your cart.`,
    });
  };

  if (isLoading) {
    return (
      <section className="py-6 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Featured Products
            </h2>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="py-6 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Featured Products
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto text-sm">
            Discover our most popular healthcare products, carefully selected for
            quality and effectiveness.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
          {products.map((product) => (
            <Card
              key={product.id}
              className="group hover:shadow-md transition-shadow duration-200"
            >
              <CardContent className="p-2">
                <div className="aspect-[4/3] bg-gray-100 rounded-lg mb-2 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <ShoppingCart
                          size={28}
                          className="mx-auto mb-1 opacity-50"
                        />
                        <span className="text-xs">No Image</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <h3 className="font-semibold text-base line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-gray-600 text-xs line-clamp-2">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-blue-600">
                      KES {product.price.toLocaleString()}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {product.category}
                    </Badge>
                  </div>

                  {product.prescription_required && (
                    <div className="flex items-center gap-1 text-red-600 text-xs">
                      <AlertCircle size={12} />
                      <span>Prescription Required</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="flex-1"
                      size="sm"
                    >
                      <ShoppingCart size={12} className="mr-1" />
                      Add
                    </Button>

                    <Link to={`/product/${product.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link to="/products">
            <Button variant="outline" size="md">
              View All
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;                      <span>Prescription Required</span>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="flex-1"
                      size="sm"
                    >
                      <ShoppingCart size={14} className="mr-1" />
                      Add to Cart
                    </Button>

                    <Link to={`/product/${product.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Link to="/products">
            <Button variant="outline" size="lg">
              View All Products
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, AlertCircle, MessageCircle, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FeaturedProducts = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();

  console.log('FeaturedProducts: Component rendering');

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['featuredProducts'],
    queryFn: async () => {
      console.log('FeaturedProducts: Starting products query');
      try {
        // Filter out prescription-required products from featured section
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .gt('stock', 0)
          .eq('prescription_required', false) // Only show non-prescription products
          .limit(6)
          .order('created_at', { ascending: false });
        
        console.log('FeaturedProducts: Query result:', { data, error });
        
        if (error) {
          console.error('FeaturedProducts: Supabase error:', error);
          throw error;
        }
        
        console.log('FeaturedProducts: Successfully fetched products:', data?.length || 0);
        return data || [];
      } catch (err) {
        console.error('FeaturedProducts: Query failed:', err);
        throw err;
      }
    },
    retry: 3,
    retryDelay: 1000,
  });

  const handleAddToCart = (e: React.MouseEvent, product: any) => {
    e.stopPropagation(); // Prevent card click when clicking button
    console.log('FeaturedProducts: Adding product to cart:', product.id);
    try {
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
      
      // Show success toast notification
      toast({
        title: "Added to Cart!",
        description: `${product.name} has been added to your cart.`,
      });
    } catch (err) {
      console.error('FeaturedProducts: Error adding to cart:', err);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleOrderViaWhatsApp = (e: React.MouseEvent, product: any) => {
    e.stopPropagation();
    const phoneNumber = '+254718925368';
    const message = `Hi! I would like to order:

Product: ${product.name}
Brand: ${product.brand || 'N/A'}
Price: KES ${Number(product.price || 0).toLocaleString()}
Category: ${product.category || 'N/A'}

${product.description ? `Description: ${product.description}` : ''}

Please let me know about availability and delivery details.`;

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleCardClick = (productId: string) => {
    navigate(`/product/${productId}`);
  };

  if (isLoading) {
    console.log('FeaturedProducts: Rendering loading state');
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover our most popular medicines and health products
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </CardContent>
                <CardFooter>
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    console.log('FeaturedProducts: Rendering error state:', error);
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
            <p className="text-gray-600 mb-8">
              Unable to load products at the moment. Please try again later.
            </p>
            <div className="space-x-4">
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
              <Button variant="outline" onClick={() => navigate('/products')}>
                Browse All Products
              </Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!products || products.length === 0) {
    console.log('FeaturedProducts: No products found');
    return (
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
            <p className="text-gray-600 mb-8">
              No products available at the moment. Check back soon!
            </p>
            <Button onClick={() => navigate('/products')}>
              Browse All Products
            </Button>
          </div>
        </div>
      </section>
    );
  }

  console.log('FeaturedProducts: Rendering products grid with', products.length, 'products');

  return (
    <section className="py-8 md:py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Featured Products</h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
            Discover quality over-the-counter medicines and health products
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {products.map((product) => (
            <Card 
              key={product.id} 
              className="group hover:shadow-lg transition-shadow duration-300 flex flex-col cursor-pointer overflow-hidden"
              onClick={() => handleCardClick(product.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base md:text-lg group-hover:text-blue-600 transition-colors line-clamp-2">
                      {product.name || 'Unnamed Product'}
                    </CardTitle>
                    <p className="text-xs md:text-sm text-gray-600 mt-1 truncate">{product.brand || 'No Brand'}</p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-24 md:h-32 object-cover rounded mb-3 md:mb-4"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                
                <div className={`w-full h-24 md:h-32 bg-gray-100 rounded flex flex-col items-center justify-center mb-3 md:mb-4 ${product.image_url ? 'hidden' : ''}`}>
                  <Package className="h-8 md:h-12 w-8 md:w-12 text-gray-400 mb-1 md:mb-2" />
                  <p className="text-gray-500 text-xs">No image</p>
                </div>
                
                <p className="text-gray-700 text-xs md:text-sm mb-3 md:mb-4 line-clamp-2">
                  {product.description || 'No description available'}
                </p>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-lg md:text-2xl font-bold text-blue-600">
                      KES {Number(product.price || 0).toLocaleString()}
                    </p>
                    <p className="text-xs md:text-sm text-gray-600">
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0 ml-2">
                    {product.category || 'Uncategorized'}
                  </Badge>
                </div>
              </CardContent>
              
              <CardFooter className="pt-4 space-y-2">
                <div className="flex flex-col gap-2 w-full">
                  <Button 
                    onClick={(e) => handleAddToCart(e, product)}
                    disabled={product.stock === 0}
                    size="sm"
                    className="w-full text-xs md:text-sm"
                  >
                    <ShoppingCart className="mr-1 md:mr-2 h-3 md:h-4 w-3 md:w-4" />
                    {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                  </Button>
                  <Button 
                    onClick={(e) => handleOrderViaWhatsApp(e, product)}
                    variant="outline"
                    size="sm"
                    className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100 hover:text-green-800 hover:border-green-300 text-xs md:text-sm"
                  >
                    <MessageCircle className="mr-1 md:mr-2 h-3 md:h-4 w-3 md:w-4" />
                    Order via WhatsApp
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8 md:mt-12">
          <Button 
            onClick={() => navigate('/products')}
            variant="outline"
            size="lg"
            className="text-sm md:text-base"
          >
            View All Products
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;


import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/contexts/CartContext';
import { ShoppingCart, AlertCircle, ArrowLeft, Package, Shield, MessageCircle, RefreshCw } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  // Redirect to 404 if no ID is provided
  useEffect(() => {
    if (!id) {
      navigate('/404', { replace: true });
    }
  }, [id, navigate]);

  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      if (!id) throw new Error('Product ID is required');
      
      console.log('Fetching product with ID:', id);
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('Error fetching product:', error);
        throw error;
      }
      
      console.log('Product fetched successfully:', data);
      return data as Product;
    },
    enabled: !!id,
    retry: 3,
    retryDelay: 1000
  });

  const handleAddToCart = () => {
    if (product) {
      addToCart({
        id: product.id,
        name: product.name,
        price: product.price,
        prescription_required: product.prescription_required,
        quantity: 1,
        image_url: product.image_url,
        stock: product.stock
      });
    }
  };

  const handleWhatsAppOrder = () => {
    if (product) {
      const message = `Hello! I would like to order this product:

*${product.name}*
Brand: ${product.brand}
Category: ${product.category}
Price: KES ${product.price.toLocaleString()}
${product.prescription_required ? '⚠️ Prescription Required' : ''}

${product.description ? `Description: ${product.description}` : ''}

Please let me know about availability and delivery details.`;

      const whatsappUrl = `https://wa.me/254718925368?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  const handleRetry = () => {
    refetch();
  };

  if (!id) {
    return null; // Will redirect to 404
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">Loading product details...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center max-w-md mx-auto">
            <div className="mb-8">
              <Package className="h-24 w-24 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Not Found</h2>
              <p className="text-gray-600 mb-2">
                {error?.message?.includes('No rows') || error?.message?.includes('not found') 
                  ? "This product doesn't exist or may have been removed."
                  : "There was an error loading this product. This might be a temporary issue."
                }
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Product ID: {id}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              
              <Button onClick={handleRetry} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              
              <Button onClick={() => navigate('/products')}>
                View All Products
              </Button>
            </div>
            
            <div className="mt-8 text-sm text-gray-500">
              <p>Having trouble? Try:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Checking your internet connection</li>
                <li>Going back to the products page</li>
                <li>Refreshing the page</li>
              </ul>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/products')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Products
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-96 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=400&h=400&fit=crop';
                    }}
                  />
                ) : (
                  <div className="w-full h-96 bg-gray-100 rounded-lg flex flex-col items-center justify-center">
                    <Package className="h-24 w-24 text-gray-400 mb-4" />
                    <p className="text-gray-500 text-sm">No image available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
                {product.prescription_required && (
                  <Badge variant="secondary" className="bg-red-100 text-red-800">
                    <AlertCircle size={14} className="mr-1" />
                    Prescription Required
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 mb-4">
                <Badge variant="outline">{product.category}</Badge>
                <span className="text-gray-600">{product.brand}</span>
              </div>
              
              <p className="text-4xl font-bold text-blue-600 mb-4">
                KES {product.price.toLocaleString()}
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600">{product.description || 'No description available'}</p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                    </span>
                  </div>
                  
                  {product.prescription_required && (
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-red-500" />
                      <span className="text-sm text-red-600">Prescription verification required</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  onClick={handleAddToCart}
                  disabled={product.stock === 0}
                  className="flex-1"
                  size="lg"
                >
                  <ShoppingCart size={20} className="mr-2" />
                  {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                </Button>
                
                <Button
                  onClick={handleWhatsAppOrder}
                  variant="outline"
                  className="flex-1 bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  size="lg"
                >
                  <MessageCircle size={20} className="mr-2" />
                  Order via WhatsApp
                </Button>
              </div>
              
              {product.prescription_required && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle size={16} />
                    <span className="font-medium">Prescription Required</span>
                  </div>
                  <p className="text-sm text-yellow-700 mt-1">
                    This medication requires a valid prescription. You'll need to upload your prescription during checkout or when ordering via WhatsApp.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ProductDetail;

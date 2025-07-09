
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Package, TrendingUp, DollarSign } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useQuery } from '@tanstack/react-query';
import ProductForm from '@/components/ProductForm';

type ProductData = {
  id: string;
  name: string;
  category: string | null;
  price: number;
  stock: number;
  created_at: string;
};

type OrderItemData = {
  quantity: number;
  price: number;
};

const SellerDashboard = () => {
  const { user, isSeller } = useAuth();
  const navigate = useNavigate();
  const [showProductForm, setShowProductForm] = useState(false);

  if (!user || !isSeller) {
    navigate('/auth');
    return null;
  }

  // Fetch products with explicit return type
  const { data: products = [], isLoading: productsLoading } = useQuery<ProductData[]>({
    queryKey: ['seller-products', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, price, stock, created_at')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }
      return data as ProductData[];
    },
    enabled: !!user && isSeller,
  });

  // Extract product IDs using useMemo to prevent unnecessary recalculations
  const productIds = useMemo(() => {
    return products?.map(p => p.id) || [];
  }, [products]);

  // Fetch order items using the memoized product IDs
  const { data: orderItems = [] } = useQuery<OrderItemData[]>({
    queryKey: ['seller-order-items', user.id, productIds.length],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('order_items')
        .select('quantity, price')
        .in('product_id', productIds);
      
      if (error) {
        console.error('Error fetching order items:', error);
        throw error;
      }
      return data as OrderItemData[];
    },
    enabled: !!user && isSeller && productIds.length > 0,
  });

  const totalProducts = products.length;
  const totalSales = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalOrders = orderItems.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Seller Dashboard</h1>
            <Button onClick={() => setShowProductForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalProducts}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KES {totalSales.toLocaleString()}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Orders</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalOrders}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {products.filter(p => p.stock > 0).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Products</CardTitle>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="text-center py-4">Loading products...</div>
              ) : products.length > 0 ? (
                <div className="space-y-4">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{product.name}</h3>
                        <p className="text-sm text-gray-600">{product.category}</p>
                        <p className="text-sm font-medium">KES {product.price.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                          {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No products yet. <Button variant="link" onClick={() => setShowProductForm(true)}>Add your first product</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showProductForm && (
        <ProductForm onClose={() => setShowProductForm(false)} />
      )}

      <Footer />
    </div>
  );
};

export default SellerDashboard;

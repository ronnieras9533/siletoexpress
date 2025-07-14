import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  Plus,
  Edit,
  Trash2,
  Upload,
  MessageCircle,
  Bell
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminProductForm from '@/components/AdminProductForm';
import AdminOrdersTable from '@/components/AdminOrdersTable';
import AdminPrescriptionsTable from '@/components/AdminPrescriptionsTable';
import AdminPrescriptionOrdersTable from '@/components/AdminPrescriptionOrdersTable';
import AdminOrderTracking from '@/components/AdminOrderTracking';

const AdminDashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Fetch dashboard stats
  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const [products, orders, users, prescriptions, notifications, messages] = await Promise.all([
        supabase.from('products').select('id, stock').then(r => r.data || []),
        supabase.from('orders').select('id, total_amount, status').then(r => r.data || []),
        supabase.from('profiles').select('id').then(r => r.data || []),
        supabase.from('prescriptions').select('id, status').then(r => r.data || []),
        supabase.from('notifications').select('id, read').then(r => r.data || []),
        supabase.from('chat_messages').select('id, read, is_admin_message').then(r => r.data || [])
      ]);

      // Filter out pending orders from revenue calculation (only count approved/delivered orders)
      const completedOrders = orders.filter(order => order.status === 'confirmed' || order.status === 'delivered');
      
      return {
        totalProducts: products.length,
        lowStockProducts: products.filter(p => p.stock < 10).length,
        totalOrders: completedOrders.length,
        totalRevenue: completedOrders.reduce((sum, order) => sum + Number(order.total_amount), 0),
        totalUsers: users.length,
        pendingPrescriptions: prescriptions.filter(p => p.status === 'pending').length,
        unreadNotifications: notifications.filter(n => !n.read).length,
        unreadMessages: messages.filter(m => !m.read && !m.is_admin_message).length
      };
    },
    enabled: !!user && isAdmin
  });

  // Fetch products for management
  const { data: products, isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['adminProducts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin
  });

  // Fetch recent orders for quick tracking updates
  const { data: recentOrders } = useQuery({
    queryKey: ['adminRecentOrders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles(full_name, email),
          order_items(*, products(name))
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user && isAdmin
  });

  if (!user || !isAdmin) {
    navigate('/auth');
    return null;
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (!error) {
      refetchProducts();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.lowStockProducts || 0} low stock
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.pendingPrescriptions || 0} pending prescriptions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KES {stats?.totalRevenue?.toLocaleString() || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Communications</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.unreadMessages || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.unreadNotifications || 0} unread notifications
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="orders" className="space-y-4">
            <TabsList>
              <TabsTrigger value="orders">Orders & Tracking</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="prescription-orders">Orders with Prescriptions</TabsTrigger>
              <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Orders - Quick Update</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentOrders && recentOrders.length > 0 ? (
                      <div className="space-y-4">
                        {recentOrders.slice(0, 5).map((order) => (
                          <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium">#{order.id.slice(0, 8)}</p>
                              <p className="text-sm text-gray-600">{order.profiles?.full_name}</p>
                              <p className="text-sm text-gray-500">KES {order.total_amount.toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={`${
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                order.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.status.replace('_', ' ')}
                              </Badge>
                              <AdminOrderTracking 
                                orderId={order.id} 
                                currentStatus={order.status}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">No recent orders</div>
                    )}
                  </CardContent>
                </Card>

                {/* Order Status Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Status Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'].map((status) => {
                        const count = recentOrders?.filter(order => order.status === status).length || 0;
                        return (
                          <div key={status} className="flex justify-between items-center">
                            <span className="capitalize">{status.replace('_', ' ')}</span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Full Orders Table */}
              <AdminOrdersTable />
            </TabsContent>

            <TabsContent value="products" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Product Management</h2>
                <Button onClick={() => setShowProductForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </div>

              <Card>
                <CardContent className="p-6">
                  {productsLoading ? (
                    <div className="text-center py-8">Loading products...</div>
                  ) : products && products.length > 0 ? (
                    <div className="space-y-4">
                      {products.map((product) => (
                        <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-4">
                              {product.image_url && (
                                <img 
                                  src={product.image_url} 
                                  alt={product.name}
                                  className="w-16 h-16 object-cover rounded"
                                />
                              )}
                              <div>
                                <h3 className="font-medium">{product.name}</h3>
                                <p className="text-sm text-gray-600">{product.category}</p>
                                <p className="text-sm font-medium">KES {Number(product.price).toLocaleString()}</p>
                                {product.prescription_required && (
                                  <Badge variant="secondary" className="bg-red-100 text-red-800 mt-1">
                                    Prescription Required
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge variant={product.stock > 10 ? "default" : product.stock > 0 ? "secondary" : "destructive"}>
                              {product.stock} in stock
                            </Badge>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setEditingProduct(product);
                                  setShowProductForm(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteProduct(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
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
            </TabsContent>

            <TabsContent value="prescription-orders">
              <AdminPrescriptionOrdersTable />
            </TabsContent>

            <TabsContent value="prescriptions">
              <AdminPrescriptionsTable />
            </TabsContent>

            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Dashboard</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    Analytics dashboard coming soon...
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {showProductForm && (
        <AdminProductForm
          product={editingProduct}
          onClose={() => {
            setShowProductForm(false);
            setEditingProduct(null);
          }}
          onSuccess={() => {
            refetchProducts();
            setShowProductForm(false);
            setEditingProduct(null);
          }}
        />
      )}

      <Footer />
    </div>
  );
};

export default AdminDashboard;

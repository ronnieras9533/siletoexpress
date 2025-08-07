import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Package, FileText, Users, ShoppingCart, Clock, CheckCircle, AlertCircle, Edit, Trash2, Plus } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminOrdersTable from '@/components/AdminOrdersTable';
import AdminPrescriptionsTable from '@/components/AdminPrescriptionsTable';
import AdminPrescriptionOrdersTable from '@/components/AdminPrescriptionOrdersTable';
import AdminProductForm from '@/components/AdminProductForm';
import OrderStatusStepper from '@/components/OrderStatusStepper';

const Admin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    regularOrders: 0,
    prescriptionOrders: 0,
    totalProducts: 0,
    totalUsers: 0,
    pendingPrescriptions: 0,
    generalPrescriptions: 0
  });
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchProducts();
      fetchUsers();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        setIsAdmin(true);
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Get orders stats
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, status, requires_prescription');

      if (ordersError) throw ordersError;

      // Get products count
      const { count: productsCount, error: productsError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (productsError) throw productsError;

      // Get users count
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Get prescriptions stats
      const { data: prescriptions, error: prescriptionsError } = await supabase
        .from('prescriptions')
        .select('id, status, order_id');

      if (prescriptionsError) throw prescriptionsError;

      // Calculate stats
      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(order => order.status === 'pending').length || 0;
      const regularOrders = orders?.filter(order => !order.requires_prescription).length || 0;
      const prescriptionOrders = orders?.filter(order => order.requires_prescription).length || 0;
      const pendingPrescriptions = prescriptions?.filter(p => p.status === 'pending' && p.order_id).length || 0;
      const generalPrescriptions = prescriptions?.filter(p => !p.order_id).length || 0;

      setStats({
        totalOrders,
        pendingOrders,
        regularOrders,
        prescriptionOrders,
        totalProducts: productsCount || 0,
        totalUsers: usersCount || 0,
        pendingPrescriptions,
        generalPrescriptions
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch admin statistics",
        variant: "destructive"
      });
    }
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive"
      });
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive"
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      
      fetchProducts();
      fetchStats();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive"
      });
    }
  };

  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      });

      // Refresh stats
      fetchStats();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const handleProductFormSave = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    fetchProducts();
    fetchStats();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
          <Button onClick={() => navigate('/')}>Go to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-4 lg:py-8">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
          <p className="text-gray-600">Manage your SiletoExpress platform</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg lg:text-2xl font-bold">{stats.totalOrders}</div>
              <div className="flex items-center gap-1 lg:gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-2 w-2 lg:h-3 lg:w-3 mr-1" />
                  {stats.pendingOrders} pending
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium">Regular Orders</CardTitle>
              <Package className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg lg:text-2xl font-bold">{stats.regularOrders}</div>
              <p className="text-xs text-muted-foreground">No prescription required</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium">Prescription Orders</CardTitle>
              <FileText className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg lg:text-2xl font-bold">{stats.prescriptionOrders}</div>
              <div className="flex items-center gap-1 lg:gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  <AlertCircle className="h-2 w-2 lg:h-3 lg:w-3 mr-1" />
                  {stats.pendingPrescriptions} pending
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium">General Prescriptions</CardTitle>
              <FileText className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg lg:text-2xl font-bold">{stats.generalPrescriptions}</div>
              <p className="text-xs text-muted-foreground">From homepage uploads</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-6 lg:mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Products</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl lg:text-2xl font-bold mb-2">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground mb-3">Total products in catalog</p>
              <Button 
                size="sm" 
                className="w-full text-xs lg:text-sm"
                onClick={() => setShowProductForm(true)}
              >
                <Plus className="h-3 w-3 lg:h-4 lg:w-4 mr-2" />
                Add Product
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl lg:text-2xl font-bold mb-2">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mb-3">Registered users</p>
              <Button size="sm" className="w-full text-xs lg:text-sm" variant="outline">
                <Users className="h-3 w-3 lg:h-4 lg:w-4 mr-2" />
                View Users
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Order Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-xs lg:text-sm">
                  <span>Pending</span>
                  <Badge variant="outline">{stats.pendingOrders}</Badge>
                </div>
                <div className="flex justify-between text-xs lg:text-sm">
                  <span>Prescriptions</span>
                  <Badge variant="outline">{stats.pendingPrescriptions}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs - Fixed responsive layout */}
        <Tabs defaultValue="regular-orders" className="space-y-4 lg:space-y-6">
          <div className="w-full overflow-x-auto">
            <TabsList className="grid grid-cols-5 w-full min-w-[600px] h-auto">
              <TabsTrigger value="regular-orders" className="text-xs lg:text-sm px-1 lg:px-4 whitespace-nowrap">
                Regular Orders
              </TabsTrigger>
              <TabsTrigger value="prescription-orders" className="text-xs lg:text-sm px-1 lg:px-4 whitespace-nowrap">
                Prescription Orders
              </TabsTrigger>
              <TabsTrigger value="prescriptions" className="text-xs lg:text-sm px-1 lg:px-4 whitespace-nowrap">
                General Prescriptions
              </TabsTrigger>
              <TabsTrigger value="products" className="text-xs lg:text-sm px-1 lg:px-4 whitespace-nowrap">
                Products
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs lg:text-sm px-1 lg:px-4 whitespace-nowrap">
                Users
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="regular-orders" className="space-y-4 lg:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg lg:text-xl">Regular Orders (No Prescription Required)</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminOrdersTable 
                  orderType="regular" 
                  onStatusUpdate={handleOrderStatusUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescription-orders" className="space-y-4 lg:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg lg:text-xl">Orders with Prescriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminPrescriptionOrdersTable 
                  onStatusUpdate={handleOrderStatusUpdate}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescriptions" className="space-y-4 lg:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg lg:text-xl">General Prescriptions (Homepage Uploads)</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminPrescriptionsTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4 lg:space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 gap-4">
              <h2 className="text-lg lg:text-xl font-semibold">Product Management</h2>
              <Button onClick={() => setShowProductForm(true)} className="w-full lg:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-4 lg:p-6">
                {productsLoading ? (
                  <div className="text-center py-8">Loading products...</div>
                ) : products && products.length > 0 ? (
                  <div className="space-y-4">
                    {products.map((product) => (
                      <div key={product.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border rounded-lg gap-4">
                        <div className="flex-1">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            {product.image_url && (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-16 h-16 object-cover rounded mx-auto lg:mx-0"
                              />
                            )}
                            <div className="text-center lg:text-left">
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
                        <div className="flex flex-col lg:flex-row items-center gap-4">
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

          <TabsContent value="users" className="space-y-4 lg:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg lg:text-xl">User Management</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : users && users.length > 0 ? (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div key={user.id} className="flex flex-col lg:flex-row lg:items-center justify-between p-4 border rounded-lg gap-4">
                        <div className="flex-1">
                          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                            <div className="text-center lg:text-left">
                              <h3 className="font-medium">{user.full_name}</h3>
                              <p className="text-sm text-gray-600">{user.email}</p>
                              <p className="text-sm text-gray-500">
                                {user.phone && `Phone: ${user.phone}`}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col lg:flex-row items-center gap-4">
                          <Badge variant={user.role === 'admin' ? "default" : "secondary"}>
                            {user.role}
                          </Badge>
                          <p className="text-sm text-gray-500">
                            {new Date(user.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No users found
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {showProductForm && (
        <AdminProductForm
          product={editingProduct}
          onSave={handleProductFormSave}
          onCancel={() => {
            setShowProductForm(false);
            setEditingProduct(null);
          }}
        />
      )}

      <Footer />
    </div>
  );
};

export default Admin;

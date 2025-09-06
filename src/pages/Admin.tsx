import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Package, FileText, Users, ShoppingCart, Clock, CheckCircle, AlertCircle, Edit, Trash2, Plus } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AdminOrdersTable from '@/components/AdminOrdersTable';
import AdminPrescriptionsTable from '@/components/AdminPrescriptionsTable';
import AdminPrescriptionOrdersTable from '@/components/AdminPrescriptionOrdersTable';
import AdminProductForm from '@/components/AdminProductForm';
import AdminUserManagement from '@/components/AdminUserManagement';
import AdminProductManagement from '@/components/AdminProductManagement';

type OrderStatus = 'pending' | 'approved' | 'delivered' | 'cancelled' | 'confirmed' | 'processing' | 'shipped' | 'out_for_delivery';

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

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
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
        .select('id, status, requires_prescription, payment_status');

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
      const pendingOrders = orders?.filter((order: any) => order.status === 'pending').length || 0;
      const regularOrders = orders?.filter((order: any) => !order.requires_prescription).length || 0;
      const prescriptionOrders = orders?.filter((order: any) => order.requires_prescription).length || 0;
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

  const handleOrderStatusUpdate = async (orderId: string, newStatus: OrderStatus) => {
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
          <p className="text-gray-600">Manage your Sileto Pharmaceuticals platform</p>
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

        {/* Main Content Tabs - Updated with paid/unpaid orders */}
        <Tabs defaultValue="regular-orders" className="space-y-4 lg:space-y-6">
          <div className="w-full">
            <div className="overflow-x-auto pb-2">
              <TabsList className="flex h-auto w-max min-w-full lg:w-full lg:grid lg:grid-cols-6 p-1">
                <TabsTrigger 
                  value="regular-orders" 
                  className="text-xs lg:text-sm px-2 lg:px-4 py-2 whitespace-nowrap flex-shrink-0 min-w-[100px] lg:min-w-0"
                >
                  Regular Orders
                </TabsTrigger>
                <TabsTrigger 
                  value="prescription-orders" 
                  className="text-xs lg:text-sm px-2 lg:px-4 py-2 whitespace-nowrap flex-shrink-0 min-w-[100px] lg:min-w-0"
                >
                  Rx Orders
                </TabsTrigger>
                <TabsTrigger 
                  value="paid-orders" 
                  className="text-xs lg:text-sm px-2 lg:px-4 py-2 whitespace-nowrap flex-shrink-0 min-w-[100px] lg:min-w-0"
                >
                  Paid Orders
                </TabsTrigger>
                <TabsTrigger 
                  value="unpaid-orders" 
                  className="text-xs lg:text-sm px-2 lg:px-4 py-2 whitespace-nowrap flex-shrink-0 min-w-[100px] lg:min-w-0"
                >
                  Unpaid Orders
                </TabsTrigger>
                <TabsTrigger 
                  value="users" 
                  className="text-xs lg:text-sm px-2 lg:px-4 py-2 whitespace-nowrap flex-shrink-0 min-w-[100px] lg:min-w-0"
                >
                  Users
                </TabsTrigger>
                <TabsTrigger 
                  value="products" 
                  className="text-xs lg:text-sm px-2 lg:px-4 py-2 whitespace-nowrap flex-shrink-0 min-w-[100px] lg:min-w-0"
                >
                  Products
                </TabsTrigger>
              </TabsList>
            </div>
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

          <TabsContent value="paid-orders" className="space-y-4 lg:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg lg:text-xl">Paid Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminOrdersTable paymentStatusFilter="paid" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unpaid-orders" className="space-y-4 lg:space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg lg:text-xl">Unpaid Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminOrdersTable paymentStatusFilter="unpaid" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4 lg:space-y-6">
            <AdminUserManagement />
          </TabsContent>

          <TabsContent value="products" className="space-y-4 lg:space-y-6">
            <AdminProductManagement />
          </TabsContent>
        </Tabs>
      </div>

      {showProductForm && (
        <AdminProductForm
          product={editingProduct}
          onSave={() => {
            setShowProductForm(false);
            setEditingProduct(null);
            fetchStats();
          }}
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

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  TrendingUp,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import AdminOrdersTable from '@/components/AdminOrdersTable';
import AdminPrescriptionOrdersTable from '@/components/AdminPrescriptionOrdersTable';
import AdminPrescriptionsTable from '@/components/AdminPrescriptionsTable';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [totalUsers, setTotalUsers] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const { data: usersCount, isLoading: isLoadingUsers, error: errorUsers } = useQuery({
    queryKey: ['usersCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  const { data: productsCount, isLoading: isLoadingProducts, error: errorProducts } = useQuery({
    queryKey: ['productsCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  const { data: ordersCount, isLoading: isLoadingOrders, error: errorOrders } = useQuery({
    queryKey: ['ordersCount'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  const { data: monthlyRevenueData, isLoading: isLoadingRevenue, error: errorRevenue } = useQuery({
    queryKey: ['monthlyRevenue'],
    queryFn: async () => {
      const currentDate = new Date();
      const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString();
      const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString();

      const { data, error } = await supabase
        .from('orders')
        .select('total_amount')
        .gte('created_at', firstDayOfMonth)
        .lte('created_at', lastDayOfMonth);

      if (error) throw error;

      const totalRevenue = data?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
      return totalRevenue;
    },
  });

  useEffect(() => {
    if (usersCount !== undefined) {
      setTotalUsers(usersCount);
    }
    if (productsCount !== undefined) {
      setTotalProducts(productsCount);
    }
    if (ordersCount !== undefined) {
      setTotalOrders(ordersCount);
    }
    if (monthlyRevenueData !== undefined) {
      setMonthlyRevenue(monthlyRevenueData);
    }
  }, [usersCount, productsCount, ordersCount, monthlyRevenueData]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus as any })
        .eq('id', orderId);

      if (error) throw error;

      // Refresh the data
      // You might want to invalidate queries here
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your store efficiently</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 mr-1" />
                Total Users
              </CardTitle>
              <Users className="h-8 w-8 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-gray-500">
                {isLoadingUsers ? 'Loading...' : errorUsers ? 'Error' : 'Active users'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 mr-1" />
                Total Products
              </CardTitle>
              <Package className="h-8 w-8 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProducts}</div>
              <p className="text-xs text-gray-500">
                {isLoadingProducts ? 'Loading...' : errorProducts ? 'Error' : 'Available products'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 mr-1" />
                Total Orders
              </CardTitle>
              <ShoppingCart className="h-8 w-8 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-gray-500">
                {isLoadingOrders ? 'Loading...' : errorOrders ? 'Error' : 'Orders placed'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 mr-1" />
                Monthly Revenue
              </CardTitle>
              <TrendingUp className="h-8 w-8 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {Number(monthlyRevenue).toLocaleString()}</div>
              <p className="text-xs text-gray-500">
                {isLoadingRevenue ? 'Loading...' : errorRevenue ? 'Error' : 'Revenue this month'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">All Orders</TabsTrigger>
            <TabsTrigger value="prescription-orders">Prescription Orders</TabsTrigger>
            <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          </TabsList>

          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>All Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminOrdersTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescription-orders">
            <Card>
              <CardHeader>
                <CardTitle>Prescription Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminPrescriptionOrdersTable onStatusUpdate={handleStatusUpdate} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prescriptions">
            <Card>
              <CardHeader>
                <CardTitle>Prescriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminPrescriptionsTable />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;

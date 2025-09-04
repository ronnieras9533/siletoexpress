// src/pages/AdminDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react';
import AdminOrdersTable from '@/components/AdminOrdersTable';
import AdminPrescriptionsTable from '@/components/AdminPrescriptionsTable';
import AdminUserManagement from '@/components/AdminUserManagement';
import AdminProductManagement from '@/components/AdminProductManagement';
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
      
      // Calculate revenue from 28th of previous month to 28th of current month
      let startDate: Date;
      let endDate: Date;
      
      if (currentDate.getDate() >= 28) {
        // If today is 28th or later, calculate from 28th of this month to 28th of next month
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 28);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 28);
      } else {
        // If today is before 28th, calculate from 28th of previous month to 28th of this month
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 28);
        endDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 28);
      }
      
      const { data, error } = await (supabase as any)
        .from('orders')
        .select('total_amount')
        .gte('created_at', startDate.toISOString())
        .lt('created_at', endDate.toISOString())
        .eq('payment_status', 'paid');
      if (error) throw error;
      return data?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
    },
  });

  useEffect(() => {
    if (usersCount !== undefined) setTotalUsers(usersCount);
    if (productsCount !== undefined) setTotalProducts(productsCount);
    if (ordersCount !== undefined) setTotalOrders(ordersCount);
    if (monthlyRevenueData !== undefined) setMonthlyRevenue(monthlyRevenueData);
  }, [usersCount, productsCount, ordersCount, monthlyRevenueData]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus } as any)
        .eq('id', orderId);
      if (error) throw error;
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your store efficiently</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
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
                <Package className="h-4 w-4" />
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
                <ShoppingCart className="h-4 w-4" />
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
                <TrendingUp className="h-4 w-4" />
                Monthly Revenue (28th-28th)
              </CardTitle>
              <TrendingUp className="h-8 w-8 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KES {Number(monthlyRevenue).toLocaleString()}</div>
              <p className="text-xs text-gray-500">
                {isLoadingRevenue ? 'Loading...' : errorRevenue ? 'Error' : 'Revenue from 28th to 28th'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="paid-orders" className="space-y-6">
          <div className="overflow-x-auto">
            <TabsList className="flex w-full min-w-max md:grid md:grid-cols-5">
              <TabsTrigger value="paid-orders" className="whitespace-nowrap px-2 text-xs md:text-sm">Paid Orders</TabsTrigger>
              <TabsTrigger value="unpaid-orders" className="whitespace-nowrap px-2 text-xs md:text-sm">Unpaid Orders</TabsTrigger>
              <TabsTrigger value="prescriptions" className="whitespace-nowrap px-2 text-xs md:text-sm">Prescriptions</TabsTrigger>
              <TabsTrigger value="users" className="whitespace-nowrap px-2 text-xs md:text-sm">Users</TabsTrigger>
              <TabsTrigger value="products" className="whitespace-nowrap px-2 text-xs md:text-sm">Products</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="paid-orders">
            <Card>
              <CardHeader>
                <CardTitle>Paid Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminOrdersTable paymentStatusFilter="paid" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unpaid-orders">
            <Card>
              <CardHeader>
                <CardTitle>Unpaid Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminOrdersTable paymentStatusFilter="unpaid" />
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

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminUserManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
              </CardHeader>
              <CardContent>
                <AdminProductManagement />
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

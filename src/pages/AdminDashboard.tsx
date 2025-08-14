import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

import AdminOrdersTable from "../components/AdminOrdersTable";
import AdminPrescriptionOrdersTable from "../components/AdminPrescriptionOrdersTable";
import AdminPrescriptionsTable from "../components/AdminPrescriptionsTable";
import AdminProductManagement from "../components/AdminProductManagement";
import AdminProductForm from "../components/AdminProductForm";
import AdminUserManagement from "../components/AdminUserManagement";
import AdminOrderTracking from "../components/AdminOrderTracking";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"0" | "1" | "2" | "3" | "4" | "5" | "6">("0");
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "ok" | "error">("checking");
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    prescriptions: 0,
    monthlyRevenue: 0,
  });

  useEffect(() => {
    const fetchUserAndStats = async () => {
      try {
        // Test Supabase connection
        const { data: testData, error: testError } = await supabase
          .from("orders")
          .select("*")
          .limit(1);

        if (testError) {
          console.error("Supabase connection error:", testError.message);
          setConnectionStatus("error");
          return;
        }
        setConnectionStatus("ok");

        // Check user authentication
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile || profile.role !== 'admin') {
          navigate('/auth');
          return;
        }

        setUser(user);
        await fetchStats();
      } catch (err) {
        console.error("Unexpected error:", err);
        setConnectionStatus("error");
        navigate('/auth');
      }
    };

    fetchUserAndStats();
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .neq('type', 'prescription');

      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .neq('type', 'prescription');

      const { count: prescriptions } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'prescription');

      const { data: monthly } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      const monthlyRevenue = monthly?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      setStats({
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        prescriptions: prescriptions || 0,
        monthlyRevenue,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
      setConnectionStatus("error");
    }
  };

  if (!user || connectionStatus === "checking") {
    return <p className="text-gray-500 mb-4">Checking database connection...</p>;
  }

  if (connectionStatus === "error") {
    return (
      <p className="text-red-500 mb-4">
        ⚠ Could not connect to Supabase. Please check API keys and network.
      </p>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <div className="stats mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>Regular Orders: {stats.totalOrders}</div>
        <div>Pending Orders: {stats.pendingOrders}</div>
        <div>Prescription Orders: {stats.prescriptions}</div>
        <div>Monthly Revenue: KSh {stats.monthlyRevenue.toLocaleString('en-KE')}</div>
      </div>

      <Tabs value={tab} onValueChange={(val) => setTab(val as any)}>
        <TabsList>
          <TabsTrigger value="0">Orders</TabsTrigger>
          <TabsTrigger value="1">Prescription Orders</TabsTrigger>
          <TabsTrigger value="2">General Prescriptions</TabsTrigger>
          <TabsTrigger value="3">Product Management</TabsTrigger>
          <TabsTrigger value="4">Add Product</TabsTrigger>
          <TabsTrigger value="5">User Management</TabsTrigger>
          <TabsTrigger value="6">Order Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="0">
          <AdminOrdersTable filter={{ type: "regular" }} />
        </TabsContent>

        <TabsContent value="1">
          <AdminPrescriptionOrdersTable />
        </TabsContent>

        <TabsContent value="2">
          <AdminPrescriptionsTable />
        </TabsContent>

        <TabsContent value="3">
          <AdminProductManagement />
        </TabsContent>

        <TabsContent value="4">
          <AdminProductForm />
        </TabsContent>

        <TabsContent value="5">
          <AdminUserManagement />
        </TabsContent>

        <TabsContent value="6">
          <AdminOrderTracking />
        </TabsContent>
      </Tabs>
    </div>
  );
}

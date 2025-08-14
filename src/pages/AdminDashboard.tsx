import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import AdminOrdersTable from "../components/AdminOrdersTable";
import AdminPrescriptionOrdersTable from "../components/AdminPrescriptionOrdersTable";
import AdminUserManagement from "../components/AdminUserManagement";
import AdminProductManagement from "../components/AdminProductManagement";
import { useCountUp } from "@/hooks/useCountUp";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"0" | "1" | "2" | "3">("0");
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "ok" | "error">("checking");
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    prescriptions: 0,
    generalPrescriptions: 0,
    monthlyRevenue: 0,
  });

  // Live count-up
  const totalOrdersCount = useCountUp(stats.totalOrders);
  const pendingOrdersCount = useCountUp(stats.pendingOrders);
  const prescriptionsCount = useCountUp(stats.prescriptions);
  const generalPrescriptionsCount = useCountUp(stats.generalPrescriptions);
  const monthlyRevenueCount = useCountUp(stats.monthlyRevenue);

  useEffect(() => {
    const fetchUserAndStats = async () => {
      try {
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

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate('/auth');
          return;
        }

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

        // Optional: subscribe to orders updates for live stats
        supabase
          .from('orders')
          .on('*', fetchStats)
          .subscribe();

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

      const { count: generalPrescriptions } = await supabase
        .from('prescriptions')
        .select('*', { count: 'exact', head: true });

      const { data: monthly } = await supabase
        .from('orders')
        .select('total_amount, created_at')
        .gte(
          'created_at',
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        );

      const monthlyRevenue =
        monthly?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      setStats({
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        prescriptions: prescriptions || 0,
        generalPrescriptions: generalPrescriptions || 0,
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
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-4 text-center hover:shadow-lg transition">
          <p className="text-gray-500">Regular Orders</p>
          <p className="text-2xl font-semibold">{totalOrdersCount}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center hover:shadow-lg transition">
          <p className="text-gray-500">Pending Orders</p>
          <p className="text-2xl font-semibold">{pendingOrdersCount}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center hover:shadow-lg transition">
          <p className="text-gray-500">Prescription Orders</p>
          <p className="text-2xl font-semibold">{prescriptionsCount}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center hover:shadow-lg transition">
          <p className="text-gray-500">General Prescriptions</p>
          <p className="text-2xl font-semibold">{generalPrescriptionsCount}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center hover:shadow-lg transition">
          <p className="text-gray-500">Monthly Revenue</p>
          <p className="text-2xl font-semibold">
            KSh {monthlyRevenueCount.toLocaleString("en-KE")}
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(val) => setTab(val as any)}>
        <TabsList>
          <TabsTrigger value="0">Orders</TabsTrigger>
          <TabsTrigger value="1">Prescription Orders</TabsTrigger>
          <TabsTrigger value="2">Users</TabsTrigger>
          <TabsTrigger value="3">Products</TabsTrigger>
        </TabsList>

        <TabsContent value="0">
          <AdminOrdersTable filter={{ type: "regular" }} />
        </TabsContent>

        <TabsContent value="1">
          <AdminPrescriptionOrdersTable />
        </TabsContent>

        <TabsContent value="2">
          <AdminUserManagement />
        </TabsContent>

        <TabsContent value="3">
          <AdminProductManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

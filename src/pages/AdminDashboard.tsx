import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import AdminOrdersTable from "../components/AdminOrdersTable";
import AdminPrescriptionOrdersTable from "../components/AdminPrescriptionOrdersTable";
import AdminUsersTable from "../components/AdminUsersTable";
import AdminProductsTable from "../components/AdminProductsTable";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"0" | "1" | "2" | "3" | "4">("0");
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "ok" | "error">("checking");
  const [user, setUser] = useState<any>(null);

  // Stats for Analytics tab
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    prescriptions: 0,
    monthlyRevenue: 0,
    totalUsers: 0,
    totalProducts: 0,
  });

  // Fetch user auth and stats
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

        // Auth
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Admin check
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (profileError || !profile || profile.role !== "admin") {
          navigate("/auth");
          return;
        }

        setUser(user);
        await fetchStats();
      } catch (err) {
        console.error("Unexpected error:", err);
        setConnectionStatus("error");
        navigate("/auth");
      }
    };

    fetchUserAndStats();
  }, [navigate]);

  // Fetch all dashboard stats
  const fetchStats = async () => {
    try {
      // Regular orders
      const { count: totalOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .neq("type", "prescription");

      const { count: pendingOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .neq("type", "prescription");

      // Prescription orders
      const { count: prescriptions } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("type", "prescription");

      // Monthly revenue
      const { data: monthly } = await supabase
        .from("orders")
        .select("total_amount, created_at")
        .gte(
          "created_at",
          new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
        );

      const monthlyRevenue =
        monthly?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      // Users
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      // Products
      const { count: totalProducts } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true });

      setStats({
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        prescriptions: prescriptions || 0,
        monthlyRevenue,
        totalUsers: totalUsers || 0,
        totalProducts: totalProducts || 0,
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

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-gray-100 rounded shadow">
          <h2 className="font-semibold">Regular Orders</h2>
          <p>{stats.totalOrders}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded shadow">
          <h2 className="font-semibold">Pending Orders</h2>
          <p>{stats.pendingOrders}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded shadow">
          <h2 className="font-semibold">Prescription Orders</h2>
          <p>{stats.prescriptions}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded shadow">
          <h2 className="font-semibold">Monthly Revenue</h2>
          <p>KSh {stats.monthlyRevenue.toLocaleString("en-KE")}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded shadow">
          <h2 className="font-semibold">Users</h2>
          <p>{stats.totalUsers}</p>
        </div>
        <div className="p-4 bg-gray-100 rounded shadow">
          <h2 className="font-semibold">Products</h2>
          <p>{stats.totalProducts}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(val) => setTab(val as any)}>
        <TabsList>
          <TabsTrigger value="0">Orders</TabsTrigger>
          <TabsTrigger value="1">Prescription Orders</TabsTrigger>
          <TabsTrigger value="2">Analytics</TabsTrigger>
          <TabsTrigger value="3">Users</TabsTrigger>
          <TabsTrigger value="4">Products</TabsTrigger>
        </TabsList>

        <TabsContent value="0">
          <AdminOrdersTable filter={{ type: "regular" }} />
        </TabsContent>

        <TabsContent value="1">
          <AdminPrescriptionOrdersTable />
        </TabsContent>

        <TabsContent value="2">
          <div className="p-2">
            <p>See the metrics above for live analytics.</p>
          </div>
        </TabsContent>

        <TabsContent value="3">
          <AdminUsersTable />
        </TabsContent>

        <TabsContent value="4">
          <AdminProductsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

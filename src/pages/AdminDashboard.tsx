import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

// Import your components
import AdminOrdersTable from "../components/AdminOrdersTable";
import AdminPrescriptionOrdersTable from "../components/AdminPrescriptionOrdersTable";
import AdminPrescriptionsTable from "../components/AdminPrescriptionsTable";
import AdminProductManagement from "../components/AdminProductManagement";
import AdminUserManagement from "../components/AdminUserManagement";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"0" | "1" | "2" | "3" | "4">("0");
  const [connectionStatus, setConnectionStatus] = useState<
    "checking" | "ok" | "error"
  >("checking");
  const [user, setUser] = useState<any>(null);

  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    prescriptions: 0,
    generalPrescriptions: 0,
    monthlyRevenue: 0,
  });

  // Fetch user & initial stats
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

        // Get authenticated user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate("/auth");
          return;
        }

        // Check if admin
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

  // Fetch stats function
  const fetchStats = async () => {
    try {
      const { count: totalOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .neq("type", "prescription");

      const { count: pendingOrders } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending")
        .neq("type", "prescription");

      const { count: prescriptions } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("type", "prescription");

      const { count: generalPrescriptions } = await supabase
        .from("prescriptions")
        .select("*", { count: "exact", head: true });

      const { data: monthly } = await supabase
        .from("orders")
        .select("total_amount, created_at")
        .gte(
          "created_at",
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

  // Real-time updates
  useEffect(() => {
    const ordersSub = supabase
      .channel("orders-channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, fetchStats)
      .subscribe();

    const prescriptionsSub = supabase
      .channel("prescriptions-channel")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prescriptions" },
        fetchStats
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersSub);
      supabase.removeChannel(prescriptionsSub);
    };
  }, []);

  if (!user || connectionStatus === "checking") {
    return (
      <p className="text-gray-500 text-center mt-10">Checking database connection...</p>
    );
  }

  if (connectionStatus === "error") {
    return (
      <p className="text-red-500 text-center mt-10">
        ⚠ Could not connect to Supabase. Please check API keys and network.
      </p>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-500">Regular Orders</p>
          <p className="text-xl font-semibold">{stats.totalOrders}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-500">Pending Orders</p>
          <p className="text-xl font-semibold">{stats.pendingOrders}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-500">Prescription Orders</p>
          <p className="text-xl font-semibold">{stats.prescriptions}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-500">General Prescriptions</p>
          <p className="text-xl font-semibold">{stats.generalPrescriptions}</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 text-center">
          <p className="text-gray-500">Monthly Revenue</p>
          <p className="text-xl font-semibold">
            KSh {stats.monthlyRevenue.toLocaleString("en-KE")}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(val) => setTab(val as any)}>
        <TabsList>
          <TabsTrigger value="0">Orders</TabsTrigger>
          <TabsTrigger value="1">Prescription Orders</TabsTrigger>
          <TabsTrigger value="2">General Prescriptions</TabsTrigger>
          <TabsTrigger value="3">Product Management</TabsTrigger>
          <TabsTrigger value="4">User Management</TabsTrigger>
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
          <AdminUserManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}

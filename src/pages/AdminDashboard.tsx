import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import AdminOrdersTable from "../components/AdminOrdersTable";
import AdminPrescriptionOrdersTable from "../components/AdminPrescriptionOrdersTable";

// Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  prescriptions: number;
  monthlyRevenue: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"0" | "1">("0");
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "ok" | "error">("checking");
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    pendingOrders: 0,
    prescriptions: 0,
    monthlyRevenue: 0,
  });

  const [monthlyRevenueData, setMonthlyRevenueData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    const fetchUserAndStats = async () => {
      try {
        // Test Supabase connection
        const { data: testData, error: testError } = await supabase.from("orders").select("*").limit(1);
        if (testError) {
          console.error("Supabase connection error:", testError.message);
          setConnectionStatus("error");
          return;
        }
        setConnectionStatus("ok");

        // Check user authentication
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Check admin role
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

  const fetchStats = async () => {
    try {
      const { count: totalOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).neq("type", "prescription");
      const { count: pendingOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending").neq("type", "prescription");
      const { count: prescriptions } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("type", "prescription");
      
      // Monthly revenue
      const { data: monthly } = await supabase
        .from("orders")
        .select("total_amount, created_at")
        .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

      const monthlyRevenue = monthly?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

      // Revenue per month for chart
      const revenueByMonth = new Array(12).fill(0);
      const { data: allOrders } = await supabase.from("orders").select("total_amount, created_at");
      allOrders?.forEach(order => {
        const month = new Date(order.created_at).getMonth();
        revenueByMonth[month] += order.total_amount || 0;
      });

      setStats({ totalOrders: totalOrders || 0, pendingOrders: pendingOrders || 0, prescriptions: prescriptions || 0, monthlyRevenue });
      setMonthlyRevenueData(revenueByMonth);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setConnectionStatus("error");
    }
  };

  if (!user || connectionStatus === "checking") {
    return <p className="text-gray-500 mb-4">Checking database connection...</p>;
  }
  if (connectionStatus === "error") {
    return <p className="text-red-500 mb-4">⚠ Could not connect to Supabase. Please check API keys and network.</p>;
  }

  // Charts data
  const pieData = {
    labels: ["Regular Orders", "Prescription Orders"],
    datasets: [
      {
        data: [stats.totalOrders, stats.prescriptions],
        backgroundColor: ["#3b82f6", "#f97316"],
      },
    ],
  };

  const barData = {
    labels: [
      "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"
    ],
    datasets: [
      {
        label: "Monthly Revenue (KES)",
        data: monthlyRevenueData,
        backgroundColor: "#10b981",
      },
    ],
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>

      <div className="stats mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white shadow rounded">
          <p className="text-gray-500">Regular Orders</p>
          <p className="text-xl font-bold">{stats.totalOrders}</p>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <p className="text-gray-500">Pending Orders</p>
          <p className="text-xl font-bold">{stats.pendingOrders}</p>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <p className="text-gray-500">Prescription Orders</p>
          <p className="text-xl font-bold">{stats.prescriptions}</p>
        </div>
        <div className="p-4 bg-white shadow rounded">
          <p className="text-gray-500">Monthly Revenue</p>
          <p className="text-xl font-bold">KSh {stats.monthlyRevenue.toLocaleString("en-KE")}</p>
        </div>
      </div>

      <div className="charts mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white shadow rounded">
          <h2 className="text-lg font-bold mb-2">Order Distribution</h2>
          <Pie data={pieData} />
        </div>
        <div className="p-4 bg-white shadow rounded">
          <h2 className="text-lg font-bold mb-2">Monthly Revenue</h2>
          <Bar data={barData} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(val) => setTab(val as "0" | "1")}>
        <TabsList>
          <TabsTrigger value="0">Orders</TabsTrigger>
          <TabsTrigger value="1">Prescription Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="0">
          <AdminOrdersTable filter={{ type: "regular" }} />
        </TabsContent>

        <TabsContent value="1">
          <AdminPrescriptionOrdersTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

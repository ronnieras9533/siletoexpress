import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Tabs, Tab } from "@mui/material";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import AdminOrdersTable from "../components/AdminOrdersTable";
import AdminPrescriptionOrdersTable from "../components/AdminPrescriptionOrdersTable";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    prescriptions: 0,
    monthlyRevenue: 0,
  });
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<number[]>([]);

  useEffect(() => {
    const fetchUserAndStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        navigate("/auth");
        return;
      }

      setUser(user);
      await fetchStats();
    };

    fetchUserAndStats();
  }, [navigate]);

  const fetchStats = async () => {
    // Total regular orders
    const { count: totalOrders } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .neq("type", "prescription");

    // Pending regular orders
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

    // Monthly revenue chart
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { data: monthlyOrders } = await supabase
      .from("orders")
      .select("total_amount, created_at")
      .gte("created_at", startOfMonth);

    const revenuePerDay: number[] = Array(new Date().getDate()).fill(0);
    monthlyOrders?.forEach((order) => {
      const day = new Date(order.created_at).getDate() - 1;
      revenuePerDay[day] += Number(order.total_amount || 0);
    });

    const monthlyRevenue = revenuePerDay.reduce((a, b) => a + b, 0);

    setStats({ totalOrders, pendingOrders, prescriptions, monthlyRevenue });
    setMonthlyRevenueData(revenuePerDay);
  };

  if (!user) return null;

  const barChartData = {
    labels: Array.from({ length: monthlyRevenueData.length }, (_, i) => `Day ${i + 1}`),
    datasets: [
      {
        label: "Revenue (KES)",
        data: monthlyRevenueData,
        backgroundColor: "rgba(75,192,192,0.6)",
      },
    ],
  };

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      <div className="stats">
        <p>Regular Orders: {stats.totalOrders}</p>
        <p>Pending Orders: {stats.pendingOrders}</p>
        <p>Prescription Orders: {stats.prescriptions}</p>
        <p>Monthly Revenue: KES {stats.monthlyRevenue.toLocaleString("en-KE")}</p>
      </div>

      <div className="charts">
        <h2>Revenue Analytics</h2>
        <Bar data={barChartData} />
      </div>

      <Tabs value={tab} onChange={(e, val) => setTab(val)}>
        <Tab label="Regular Orders" />
        <Tab label="Prescription Orders" />
      </Tabs>

      {tab === 0 && <AdminOrdersTable filter={{ type: "regular" }} />}
      {tab === 1 && <AdminPrescriptionOrdersTable />}
    </div>
  );
}

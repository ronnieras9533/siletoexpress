// src/pages/AdminDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Tabs, Tab } from '@mui/material';
import AdminOrdersTable from '../components/AdminOrdersTable';
import AdminPrescriptionOrdersTable from '../components/AdminPrescriptionOrdersTable';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState(0);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    prescriptionOrders: 0,
    monthlyRevenue: 0,
    dailyRevenue: [] as { date: string; amount: number }[],
  });

  useEffect(() => {
    const fetchUserAndStats = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        navigate('/auth');
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
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('requires_prescription', false);

    // Pending regular orders
    const { count: pendingOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('requires_prescription', false);

    // Prescription orders
    const { count: prescriptionOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('requires_prescription', true);

    // Monthly revenue
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const { data: monthlyOrders } = await supabase
      .from('orders')
      .select('total_amount, created_at')
      .gte('created_at', firstDayOfMonth.toISOString());

    const monthlyRevenue = monthlyOrders?.reduce(
      (sum, order) => sum + Number(order.total_amount || 0),
      0
    );

    // Daily revenue for chart
    const dailyMap: Record<string, number> = {};
    monthlyOrders?.forEach((order) => {
      const date = new Date(order.created_at!).toLocaleDateString('en-GB');
      dailyMap[date] = (dailyMap[date] || 0) + Number(order.total_amount || 0);
    });
    const dailyRevenue = Object.entries(dailyMap).map(([date, amount]) => ({ date, amount }));

    setStats({
      totalOrders: totalOrders || 0,
      pendingOrders: pendingOrders || 0,
      prescriptionOrders: prescriptionOrders || 0,
      monthlyRevenue: monthlyRevenue || 0,
      dailyRevenue,
    });
  };

  if (!user) return null;

  return (
    <div className="admin-dashboard" style={{ padding: '20px' }}>
      <h1>Admin Dashboard</h1>

      <div className="stats" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div>
          <h3>Regular Orders</h3>
          <p>{stats.totalOrders}</p>
        </div>
        <div>
          <h3>Pending Orders</h3>
          <p>{stats.pendingOrders}</p>
        </div>
        <div>
          <h3>Prescription Orders</h3>
          <p>{stats.prescriptionOrders}</p>
        </div>
        <div>
          <h3>Monthly Revenue</h3>
          <p>KES {stats.monthlyRevenue.toLocaleString('en-KE')}</p>
        </div>
      </div>

      <div style={{ marginBottom: '40px', maxWidth: '800px' }}>
        <Line
          data={{
            labels: stats.dailyRevenue.map((d) => d.date),
            datasets: [
              {
                label: 'Daily Revenue (KES)',
                data: stats.dailyRevenue.map((d) => d.amount),
                borderColor: 'rgba(75,192,192,1)',
                backgroundColor: 'rgba(75,192,192,0.2)',
              },
            ],
          }}
          options={{ responsive: true, plugins: { legend: { position: 'top' } } }}
        />
      </div>

      <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)}>
        <Tab label="Regular Orders" />
        <Tab label="Prescription Orders" />
      </Tabs>

      {tab === 0 && <AdminOrdersTable />}
      {tab === 1 && <AdminPrescriptionOrdersTable />}
    </div>
  );
}

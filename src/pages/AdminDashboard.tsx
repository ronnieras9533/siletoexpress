import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Tabs, Tab } from '@mui/material';
import OrdersTable from './OrdersTable';
import PrescriptionsTable from './PrescriptionsTable';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    prescriptions: 0,
    monthlyRevenue: 0,
  });
  const [tab, setTab] = useState(0);

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
    // Regular (non-prescription) orders count
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .neq('type', 'prescription');

    // Pending regular orders
    const { count: pendingOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')
      .neq('type', 'prescription');

    // Prescription orders count
    const { count: prescriptions } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'prescription');

    // Monthly revenue (all orders)
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
      monthlyRevenue,
    });
  };

  if (!user) {
    return null; // Prevents flicker while checking auth
  }

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      <div className="stats">
        <p>Regular Orders: {stats.totalOrders}</p>
        <p>Pending Regular Orders: {stats.pendingOrders}</p>
        <p>Prescription Orders: {stats.prescriptions}</p>
        <p>
          Monthly Revenue: KSh {stats.monthlyRevenue.toLocaleString('en-KE')}
        </p>
      </div>

      <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)}>
        <Tab label="Regular Orders" />
        <Tab label="Prescription Orders" />
      </Tabs>

      {tab === 0 && <OrdersTable filter={{ type: 'regular' }} />}
      {tab === 1 && <PrescriptionsTable />}
    </div>
  );
}

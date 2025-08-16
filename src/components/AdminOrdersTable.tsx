// src/components/AdminOrdersTable.tsx
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui';
import MpesaPaymentButton from '@/components/payments/MpesaPaymentButton';
import { updateOrderStatus, fetchOrders } from '@/services/ordersService';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface Order {
  id: string;
  user_id: string;
  status: 'pending' | 'confirmed' | 'delivered';
  payment_status: 'pending' | 'paid' | 'failed';
  total_amount: number;
  phone_number?: string;
}

const AdminOrdersTable: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (err) {
      console.error('Error fetching orders', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch orders.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, { payment_status: 'paid' });
      toast({ title: 'Success', description: 'Order marked as paid.' });
      await loadOrders();
    } catch (err: any) {
      console.error('Error updating order', err);
      toast({
        title: 'Error',
        description: err?.message || 'Failed to update order.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    setUpdatingId(orderId);
    try {
      await updateOrderStatus(orderId, { status: newStatus });
      toast({ title: 'Success', description: 'Order status updated.' });
      await loadOrders();
    } catch (err: any) {
      console.error('Error updating order status', err);
      toast({
        title: 'Error',
        description: err?.message || 'Failed to update status.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  if (loading) return <Loader2 className="animate-spin h-6 w-6" />;

  return (
    <table className="w-full border">
      <thead>
        <tr>
          <th>ID</th>
          <th>User</th>
          <th>Total</th>
          <th>Payment</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id} className="border-t">
            <td>{order.id}</td>
            <td>{order.user_id}</td>
            <td>KES {order.total_amount.toLocaleString()}</td>
            <td>{order.payment_status}</td>
            <td>{order.status}</td>
            <td className="flex gap-2">
              {/* Mark as Paid button for unpaid orders */}
              {order.payment_status === 'pending' && (
                <Button
                  onClick={() => handleMarkPaid(order.id)}
                  disabled={updatingId === order.id}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {updatingId === order.id ? 'Updating...' : 'Mark as Paid'}
                </Button>
              )}

              {/* Change order tracking status */}
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                disabled={updatingId === order.id}
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="delivered">Delivered</option>
              </select>

              {/* Optional: M-PESA payment button if payment is pending */}
              {order.payment_status === 'pending' && order.phone_number && (
                <MpesaPaymentButton
                  paymentData={{
                    amount: order.total_amount,
                    phoneNumber: order.phone_number,
                    orderId: order.id,
                  }}
                  onSuccess={() => loadOrders()}
                  onError={(err) =>
                    toast({ title: 'Payment Error', description: err, variant: 'destructive' })
                  }
                />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default AdminOrdersTable;

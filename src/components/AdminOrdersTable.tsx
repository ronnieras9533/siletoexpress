import React, { useState } from 'react';
import { Table, Button } from '@/components/ui';
import MpesaPaymentButton from '@/components/payments/MpesaPaymentButton';
import { updateOrderStatus, updatePaymentStatus } from '@/services/ordersService';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Order {
  id: string;
  status: string;
  payment_status: 'pending' | 'paid' | 'failed';
  total_amount: number;
  phone_number?: string;
  delivery_address?: string;
}

interface AdminOrdersTableProps {
  orders: Order[];
  refetchOrders: () => void;
}

const AdminOrdersTable: React.FC<AdminOrdersTableProps> = ({ orders, refetchOrders }) => {
  const { toast } = useToast();
  const [loadingOrderId, setLoadingOrderId] = useState<string | null>(null);

  const handleMarkAsPaid = async (orderId: string) => {
    try {
      setLoadingOrderId(orderId);
      await updatePaymentStatus(orderId, 'paid');
      toast({ title: 'Payment Updated', description: 'Order marked as paid.' });
      refetchOrders();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to mark as paid.', variant: 'destructive' });
    } finally {
      setLoadingOrderId(null);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      setLoadingOrderId(orderId);
      await updateOrderStatus(orderId, newStatus);
      toast({ title: 'Status Updated', description: `Order status updated to ${newStatus}.` });
      refetchOrders();
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    } finally {
      setLoadingOrderId(null);
    }
  };

  return (
    <Table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Status</th>
          <th>Payment</th>
          <th>Amount</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <tr key={order.id}>
            <td>{order.id.slice(0, 8)}</td>
            <td>{order.status}</td>
            <td>{order.payment_status}</td>
            <td>KES {order.total_amount.toLocaleString()}</td>
            <td className="flex gap-2">
              {/* Show Mark as Paid only for unpaid orders */}
              {order.payment_status === 'pending' && (
                <Button
                  onClick={() => handleMarkAsPaid(order.id)}
                  disabled={loadingOrderId === order.id}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Mark as Paid
                </Button>
              )}

              {/* Example status update buttons */}
              {['confirmed', 'delivered'].map((statusOption) => (
                <Button
                  key={statusOption}
                  onClick={() => handleStatusChange(order.id, statusOption)}
                  disabled={loadingOrderId === order.id || order.status === statusOption}
                  size="sm"
                >
                  {statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                </Button>
              ))}

              {/* Optionally, show M-PESA button */}
              {order.payment_status === 'pending' && (
                <MpesaPaymentButton
                  paymentData={{
                    amount: order.total_amount,
                    phoneNumber: order.phone_number || '',
                    orderId: order.id,
                  }}
                  onSuccess={() => refetchOrders()}
                  onError={(err) => toast({ title: 'Payment Failed', description: err, variant: 'destructive' })}
                />
              )}
            </td>
          </tr>
        ))}
      </tbody>

      {/* Accessibility fix for dialogs */}
      <Dialog>
        <DialogContent aria-describedby="order-dialog-desc">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          <p id="order-dialog-desc" className="sr-only">
            Order details and status update dialog.
          </p>
        </DialogContent>
      </Dialog>
    </Table>
  );
};

export default AdminOrdersTable;

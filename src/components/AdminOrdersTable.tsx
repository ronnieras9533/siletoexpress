
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import type { Database } from '@/integrations/supabase/types';

type OrderStatus = Database['public']['Enums']['order_status'];

interface OrderWithProfile {
  id: string;
  created_at: string;
  total_amount: number;
  status: OrderStatus;
  phone_number: string | null;
  delivery_address: string | null;
  mpesa_receipt_number: string | null;
  user_id: string;
  profiles: {
    full_name: string;
    email: string;
  };
  order_items: {
    quantity: number;
    price: number;
    products: {
      name: string;
    } | null;
  }[];
}

const AdminOrdersTable = () => {
  const { toast } = useToast();

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!orders_user_id_fkey(full_name, email),
          order_items(
            quantity,
            price,
            products(name)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as OrderWithProfile[];
    }
  });

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Order status updated successfully"
      });
      refetch();
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-blue-100 text-blue-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading orders...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Management</CardTitle>
      </CardHeader>
      <CardContent>
        {orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium">Order #{order.id.slice(0, 8)}</h3>
                    <p className="text-sm text-gray-600">
                      {order.profiles?.full_name} ({order.profiles?.email})
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">KES {Number(order.total_amount).toLocaleString()}</p>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2">Items:</h4>
                  <div className="space-y-1">
                    {order.order_items?.map((item, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        {item.products?.name || 'Unknown Product'} - Qty: {item.quantity} - KES {Number(item.price).toLocaleString()}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <p>Phone: {order.phone_number || 'N/A'}</p>
                    <p>Address: {order.delivery_address || 'N/A'}</p>
                    {order.mpesa_receipt_number && (
                      <p>M-PESA Receipt: {order.mpesa_receipt_number}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={order.status} onValueChange={(value: OrderStatus) => updateOrderStatus(order.id, value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No orders found.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminOrdersTable;

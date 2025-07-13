import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Database } from '@/integrations/supabase/types';

type PrescriptionStatus = Database['public']['Enums']['prescription_status'];
type OrderStatus = Database['public']['Enums']['order_status'];

interface PrescriptionOrderData {
  id: string;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  phone_number: string | null;
  delivery_address: string | null;
  profiles: {
    full_name: string;
    email: string;
  };
  prescriptions: {
    id: string;
    image_url: string;
    status: PrescriptionStatus;
    admin_notes: string | null;
    created_at: string;
  }[];
}

const AdminPrescriptionOrdersTable = () => {
  const { data: prescriptionOrders, isLoading, refetch } = useQuery({
    queryKey: ['prescriptionOrders'],
    queryFn: async () => {
      // First get orders that have prescriptions
      const { data: ordersWithPrescriptions, error: ordersError } = await supabase
        .from('prescriptions')
        .select('order_id')
        .not('order_id', 'is', null);

      if (ordersError) throw ordersError;

      const orderIds = ordersWithPrescriptions.map(p => p.order_id);
      
      if (orderIds.length === 0) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          phone_number,
          delivery_address,
          user_id,
          prescriptions (
            id,
            image_url,
            status,
            admin_notes,
            created_at
          )
        `)
        .in('id', orderIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user profiles separately
      const userIds = data.map(order => order.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Combine the data
      return data.map(order => ({
        ...order,
        profiles: profiles.find(p => p.id === order.user_id) || { full_name: 'Unknown', email: 'Unknown' }
      })) as PrescriptionOrderData[];
    }
  });

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update order status');
    } else {
      toast.success('Order status updated successfully');
      refetch();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Orders with Prescriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading prescription orders...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Orders with Prescriptions ({prescriptionOrders?.length || 0})</CardTitle>
      </CardHeader>
      <CardContent>
        {prescriptionOrders && prescriptionOrders.length > 0 ? (
          <div className="space-y-6">
            {prescriptionOrders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Order #{order.id.slice(0, 8)}</h3>
                    <p className="text-sm text-gray-600">
                      Customer: {order.profiles?.full_name} ({order.profiles?.email})
                    </p>
                    <p className="text-sm text-gray-600">
                      Amount: KES {Number(order.total_amount).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      Phone: {order.phone_number || 'Not provided'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Address: {order.delivery_address || 'Not provided'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Created: {format(new Date(order.created_at), 'PPp')}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                    {order.status === 'pending' && (
                      <div className="space-x-2">
                        <Button 
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'approved')}
                        >
                          Approve
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => updateOrderStatus(order.id, 'cancelled')}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                    {order.status === 'approved' && (
                      <Button 
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                      >
                        Mark Delivered
                      </Button>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Prescriptions ({order.prescriptions.length})</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {order.prescriptions.map((prescription) => (
                      <div key={prescription.id} className="border rounded p-3 space-y-2">
                        <img 
                          src={prescription.image_url} 
                          alt="Prescription"
                          className="w-full h-32 object-cover rounded"
                        />
                        <div className="flex items-center justify-between">
                          <Badge className={getStatusColor(prescription.status)}>
                            {prescription.status}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {format(new Date(prescription.created_at), 'PP')}
                          </span>
                        </div>
                        {prescription.admin_notes && (
                          <div className="text-xs">
                            <span className="font-medium">Notes:</span>
                            <p className="text-gray-600 mt-1">{prescription.admin_notes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No orders with prescriptions found.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPrescriptionOrdersTable;
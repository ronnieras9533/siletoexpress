
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { Check, X } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type OrderStatus = Database['public']['Enums']['order_status'];
type PrescriptionStatus = Database['public']['Enums']['prescription_status'];

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
  } | null;
  order_items: {
    quantity: number;
    price: number;
    products: {
      name: string;
    } | null;
  }[];
  prescriptions: {
    id: string;
    image_url: string;
    status: PrescriptionStatus;
    admin_notes: string | null;
    created_at: string;
  }[];
}

const AdminOrdersTable = () => {
  const { toast } = useToast();
  const [selectedPrescription, setSelectedPrescription] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['adminOrders'],
    queryFn: async () => {
      console.log('Fetching orders with prescriptions...');
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            quantity,
            price,
            products(name)
          ),
          prescriptions!prescriptions_order_id_fkey(
            id,
            image_url,
            status,
            admin_notes,
            created_at
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      console.log('Raw orders data:', data);

      // Fetch profiles separately
      const userIds = data.map(order => order.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }

      // Combine orders with profiles
      const ordersWithProfiles = data.map(order => ({
        ...order,
        profiles: profiles?.find(profile => profile.id === order.user_id) || null
      }));

      console.log('Orders with profiles and prescriptions:', ordersWithProfiles);
      return ordersWithProfiles as OrderWithProfile[];
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

  const updatePrescriptionStatus = async (prescriptionId: string, status: PrescriptionStatus, notes?: string) => {
    const { error } = await supabase
      .from('prescriptions')
      .update({ 
        status,
        admin_notes: notes || null
      })
      .eq('id', prescriptionId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update prescription status",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Prescription status updated successfully"
      });
      refetch();
      setSelectedPrescription(null);
      setAdminNotes('');
    }
  };

  const getStatusColor = (status: OrderStatus | PrescriptionStatus) => {
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
                      {order.profiles?.full_name || 'Unknown User'} ({order.profiles?.email || 'No email'})
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

                {/* Prescription Section - Only show if prescriptions exist for this order */}
                {order.prescriptions && order.prescriptions.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium mb-3 text-blue-800">Order Prescription</h4>
                    {order.prescriptions.map((prescription) => (
                      <div key={prescription.id} className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(prescription.status)}>
                              {prescription.status}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              Uploaded: {format(new Date(prescription.created_at), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <img 
                            src={prescription.image_url} 
                            alt="Order Prescription"
                            className="max-w-xs max-h-48 object-contain border rounded cursor-pointer"
                            onClick={() => window.open(prescription.image_url, '_blank')}
                          />
                          <p className="text-xs text-gray-500 mt-1">Click to view full size prescription</p>
                        </div>

                        {prescription.admin_notes && (
                          <div className="p-3 bg-gray-50 rounded">
                            <p className="text-sm font-medium">Admin Notes:</p>
                            <p className="text-sm text-gray-600">{prescription.admin_notes}</p>
                          </div>
                        )}

                        {prescription.status === 'pending' && (
                          <div className="space-y-3">
                            <Textarea
                              placeholder="Add notes for prescription review (optional)"
                              value={selectedPrescription === prescription.id ? adminNotes : ''}
                              onChange={(e) => {
                                setSelectedPrescription(prescription.id);
                                setAdminNotes(e.target.value);
                              }}
                              className="min-h-20"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => updatePrescriptionStatus(prescription.id, 'approved', adminNotes)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve Prescription
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updatePrescriptionStatus(prescription.id, 'rejected', adminNotes)}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject Prescription
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

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

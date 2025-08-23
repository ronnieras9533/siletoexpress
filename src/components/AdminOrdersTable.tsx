import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Eye, MapPin, Phone, Clock, Package, Truck, CheckCircle, FileText, Image } from 'lucide-react';
import OrderStatusStepper from './OrderStatusStepper';

interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  phone_number: string | null;
  delivery_address: string | null;
  county: string | null;
  delivery_instructions: string | null;
  delivery_fee: number | null;
  payment_method: string | null;
  currency: string | null;
  requires_prescription: boolean | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
  order_items: {
    quantity: number;
    price: number;
    products: {
      name: string;
      prescription_required: boolean;
    };
  }[];
  order_tracking: {
    status: string;
    created_at: string;
    note: string | null;
    location: string | null;
  }[];
  prescriptions?: {
    id: string;
    image_url: string;
    status: string;
    admin_notes: string | null;
    created_at: string;
  }[];
}

interface AdminOrdersTableProps {
  orderType?: 'regular' | 'all';
  paymentStatusFilter?: 'paid' | 'unpaid';
  onStatusUpdate?: (orderId: string, newStatus: string) => void;
}

const AdminOrdersTable: React.FC<AdminOrdersTableProps> = ({ orderType = 'all', paymentStatusFilter, onStatusUpdate }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, [orderType, paymentStatusFilter]);

  useEffect(() => {
    if (selectedPrescription) {
      setAdminNotes(selectedPrescription.admin_notes || '');
    }
  }, [selectedPrescription]);

  const fetchOrders = async () => {
    try {
      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            price,
            products (name, prescription_required)
          ),
          order_tracking (
            status,
            created_at,
            note,
            location
          ),
          prescriptions (
            id,
            image_url,
            status,
            admin_notes,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (orderType === 'regular') {
        query = query.or('requires_prescription.is.null,requires_prescription.eq.false');
      }

      if (paymentStatusFilter) {
        query = query.eq('payment_status', paymentStatusFilter);
      }

      const { data: ordersData, error } = await query;

      if (error) throw error;

      if (ordersData && ordersData.length > 0) {
        const userIds = ordersData.map(order => order.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        const ordersWithProfiles = ordersData.map(order => ({
          ...order,
          profiles: profilesData?.find(profile => profile.id === order.user_id) || null
        }));

        setOrders(ordersWithProfiles);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      });

      fetchOrders();
      
      if (onStatusUpdate) {
        onStatusUpdate(orderId, newStatus);
      }
    } catch (error: any) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const handlePaymentStatusUpdate = async (orderId: string, newPaymentStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: newPaymentStatus })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Payment status updated to ${newPaymentStatus}`,
      });

      fetchOrders();
    } catch (error: any) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update payment status",
        variant: "destructive"
      });
    }
  };

  const handleApprovePrescription = async () => {
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({ status: 'approved', admin_notes: adminNotes })
        .eq('id', selectedPrescription.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Prescription approved",
      });

      setSelectedPrescription({ ...selectedPrescription, status: 'approved', admin_notes: adminNotes });
      fetchOrders();
    } catch (error: any) {
      console.error('Error approving prescription:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to approve prescription",
        variant: "destructive"
      });
    }
  };

  const handleRejectPrescription = async () => {
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({ status: 'rejected', admin_notes: adminNotes })
        .eq('id', selectedPrescription.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Prescription rejected",
      });

      setSelectedPrescription({ ...selectedPrescription, status: 'rejected', admin_notes: adminNotes });
      fetchOrders();
    } catch (error: any) {
      console.error('Error rejecting prescription:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to reject prescription",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-purple-100 text-purple-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'out_for_delivery': return 'bg-orange-100 text-orange-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'out_for_delivery': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ... your orders table and cards code remains unchanged ... */}

      {/* Prescription Image Modal */}
      {selectedPrescription && (
        <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Prescription Details ID: {selectedPrescription.id.slice(0, 8)}...</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">Status:</span> 
                  <Badge className={`ml-2 ${getStatusColor(selectedPrescription.status)}`}>
                    {selectedPrescription.status.toUpperCase()}
                  </Badge>
                </div>
                {selectedPrescription.status === 'pending' && (
                  <Button variant="outline" asChild>
                    <a href={selectedPrescription.image_url} download>
                      Download
                    </a>
                  </Button>
                )}
              </div>

              <img 
                src={selectedPrescription.image_url} 
                alt="Prescription"
                className="w-full max-h-96 object-contain rounded"
              />

              {selectedPrescription.status === 'pending' ? (
                <div className="space-y-4">
                  <div>
                    <label className="font-medium block mb-1">Admin Notes:</label>
                    <Textarea 
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Enter notes for the user..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      className="bg-green-500 hover:bg-green-600"
                      onClick={handleApprovePrescription}
                    >
                      Approve Prescription
                    </Button>
                    <Button 
                      className="bg-red-500 hover:bg-red-600"
                      onClick={handleRejectPrescription}
                    >
                      Reject Prescription
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm space-y-2">
                  {selectedPrescription.admin_notes && (
                    <div>
                      <span className="font-medium">Admin Notes:</span> 
                      <p className="text-gray-600 mt-1">{selectedPrescription.admin_notes}</p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Upload Date:</span> 
                    <span className="ml-2">{new Date(selectedPrescription.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminOrdersTable;

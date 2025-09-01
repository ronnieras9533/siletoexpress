import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Eye, Clock, Package, Truck, CheckCircle, FileText } from 'lucide-react';
import OrderStatusStepper from './OrderStatusStepper';

interface AdminOrdersTableProps {
  orderType?: 'regular' | 'all';
  paymentStatusFilter?: 'paid' | 'unpaid';
  onStatusUpdate?: (orderId: string, newStatus: string) => void;
}

const AdminOrdersTable: React.FC<AdminOrdersTableProps> = ({ 
  orderType = 'all', 
  paymentStatusFilter, 
  onStatusUpdate 
}) => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
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
      console.log('Fetching orders with filters:', { orderType, paymentStatusFilter });
      
      // Cast to any to avoid TypeScript deep instantiation error
      const query: any = supabase.from('orders').select('*').order('created_at', { ascending: false });
      
      if (paymentStatusFilter) {
        query.eq('payment_status', paymentStatusFilter);
      }
      
      const { data: ordersData, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Orders data received:', ordersData);

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
        console.log('Final orders with profiles:', ordersWithProfiles);
      } else {
        setOrders([]);
        console.log('No orders found');
      }
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: `Failed to fetch orders: ${error.message}`,
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
        .update({ status: newStatus } as any)
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
        .update({ payment_status: newPaymentStatus } as any)
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
      {orders.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold">Order #{order.id.slice(0, 8)}</h3>
                  <p className="text-sm text-gray-600">
                    {order.profiles?.full_name || 'Unknown'} • {order.profiles?.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusIcon(order.status)}
                    {formatStatus(order.status)}
                  </Badge>
                  <Badge variant={order.payment_status === 'paid' ? 'default' : 'destructive'}>
                    {order.payment_status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium">Amount</p>
                  <p className="text-sm">{order.currency || 'KES'} {order.total_amount}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Phone</p>
                  <p className="text-sm">{order.phone_number || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">County</p>
                  <p className="text-sm">{order.county || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <Select onValueChange={(value) => handleStatusUpdate(order.id, value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Update Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="shipped">Shipped</SelectItem>
                    <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                    <SelectItem value="delivered">Delivered</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select onValueChange={(value) => handlePaymentStatusUpdate(order.id, value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Payment Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedOrder(order)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </div>

              {order.order_items && order.order_items.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Items:</p>
                  <div className="space-y-1">
                    {order.order_items.map((item: any, index: number) => (
                      <p key={index} className="text-sm text-gray-600">
                        {item.products?.name} - Qty: {item.quantity} - {order.currency || 'KES'} {item.price}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {order.prescriptions && order.prescriptions.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium mb-2">Prescriptions:</p>
                  <div className="flex gap-2">
                    {order.prescriptions.map((prescription: any) => (
                      <Button
                        key={prescription.id}
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPrescription(prescription)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Prescription ({prescription.status})
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order Details #{selectedOrder.id.slice(0, 8)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Customer:</p>
                  <p>{selectedOrder.profiles?.full_name}</p>
                  <p>{selectedOrder.profiles?.email}</p>
                </div>
                <div>
                  <p className="font-medium">Contact:</p>
                  <p>{selectedOrder.phone_number}</p>
                </div>
              </div>
              
              <div>
                <p className="font-medium">Delivery Address:</p>
                <p>{selectedOrder.delivery_address}</p>
                <p>{selectedOrder.county}</p>
              </div>

              {selectedOrder.delivery_instructions && (
                <div>
                  <p className="font-medium">Delivery Instructions:</p>
                  <p>{selectedOrder.delivery_instructions}</p>
                </div>
              )}

              <OrderStatusStepper 
                currentStatus={selectedOrder.status}
                orderTracking={selectedOrder.order_tracking || []}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Prescription Image Modal */}
      {selectedPrescription && (
        <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                Prescription Details ID: {selectedPrescription.id.slice(0, 8)}...
              </DialogTitle>
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
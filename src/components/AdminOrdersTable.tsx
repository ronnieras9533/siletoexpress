import React, { useState, useEffect } from 'react';
// @ts-ignore
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Eye, Clock, Package, Truck, CheckCircle, FileText } from 'lucide-react';
import OrderStatusStepper from './OrderStatusStepper';
import PrescriptionViewer from './PrescriptionViewer';

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
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, [orderType, paymentStatusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('Fetching orders with filters:', { orderType, paymentStatusFilter });
      
      // Cast to any to avoid TypeScript type instantiation issues
      const client: any = supabase;
      
      // Use direct query without chaining to avoid type issues
      let ordersData;
      let error;
      
      if (paymentStatusFilter) {
        const result = await client
          .from('orders')
          .select('*')
          .eq('payment_status', paymentStatusFilter)
          .order('created_at', { ascending: false });
        ordersData = result.data;
        error = result.error;
      } else {
        const result = await client
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
        ordersData = result.data;
        error = result.error;
      }

      if (error) {
        console.error('Error fetching orders:', error);
        throw error;
      }

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      // Fetch related data separately to avoid complex type issues
      const orderIds = ordersData.map((order: any) => order.id);
      const userIds = ordersData.map((order: any) => order.user_id);

      // Fetch profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Fetch prescriptions
      const { data: prescriptionsData } = await supabase
        .from('prescriptions')
        .select('id, order_id, image_url, status, admin_notes, created_at, user_id')
        .in('order_id', orderIds);

      // Fetch order items with products
      const { data: orderItemsData } = await supabase
        .from('order_items')
        .select(`
          id,
          order_id,
          quantity,
          price,
          product_id
        `)
        .in('order_id', orderIds);

      // Fetch products for order items
      const productIds = orderItemsData?.map((item: any) => item.product_id) || [];
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, brand')
        .in('id', productIds);

      // Combine all data
      const ordersWithData = ordersData.map((order: any) => {
        const orderProfile = profilesData?.find((p: any) => p.id === order.user_id);
        const orderPrescriptions = prescriptionsData?.filter((p: any) => p.order_id === order.id) || [];
        const orderItems = orderItemsData?.filter((item: any) => item.order_id === order.id) || [];
        
        const itemsWithProducts = orderItems.map((item: any) => {
          const product = productsData?.find((p: any) => p.id === item.product_id);
          return {
            ...item,
            products: product
          };
        });

        return {
          ...order,
          profiles: orderProfile,
          prescriptions: orderPrescriptions,
          order_items: itemsWithProducts
        };
      });

      setOrders(ordersWithData);
      console.log('Orders fetched successfully:', ordersWithData);

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

  const handlePrescriptionAction = async (prescriptionId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const { error } = await supabase
        .from('prescriptions')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          admin_notes: notes || ''
        })
        .eq('id', prescriptionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Prescription ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      });

      fetchOrders();
      setSelectedPrescription(null);
    } catch (error: any) {
      console.error('Error updating prescription:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update prescription",
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
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
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
                  {order.requires_prescription && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700">
                      <FileText className="h-3 w-3 mr-1" />
                      Prescription Required
                    </Badge>
                  )}
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

              {/* Order Items */}
              {order.order_items && order.order_items.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium mb-2">Items:</p>
                  <div className="space-y-1">
                    {order.order_items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                        <span>{item.products?.name} ({item.products?.brand})</span>
                        <span>Qty: {item.quantity} - {order.currency || 'KES'} {item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prescriptions Section */}
              {order.prescriptions && order.prescriptions.length > 0 && (
                <div className="mb-4 border-t pt-4">
                  <p className="text-sm font-medium mb-2">Prescriptions ({order.prescriptions.length}):</p>
                  <div className="space-y-2">
                    {order.prescriptions.map((prescription: any) => (
                      <div key={prescription.id} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                        <div className="flex items-center gap-3">
                          <img 
                            src={prescription.image_url} 
                            alt="Prescription thumbnail"
                            className="w-12 h-12 object-cover rounded border"
                          />
                          <div>
                            <p className="text-sm font-medium">Prescription #{prescription.id.slice(0, 8)}</p>
                            <div className="flex items-center gap-2">
                              <Badge className={getStatusColor(prescription.status)}>
                                {prescription.status.toUpperCase()}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {new Date(prescription.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {prescription.admin_notes && (
                              <p className="text-xs text-gray-600 mt-1">
                                Notes: {prescription.admin_notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedPrescription(prescription)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
      
      {/* Prescription Viewer Modal */}
      <PrescriptionViewer
        prescription={selectedPrescription}
        isOpen={!!selectedPrescription}
        onClose={() => setSelectedPrescription(null)}
        onStatusUpdate={handlePrescriptionAction}
      />
    </div>
  );
};

export default AdminOrdersTable;
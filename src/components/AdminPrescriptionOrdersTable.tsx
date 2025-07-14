
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Eye, FileText, Clock, Package, Truck, CheckCircle, AlertCircle } from 'lucide-react';
import OrderStatusStepper from './OrderStatusStepper';

interface Order {
  id: string;
  user_id: string;
  total_amount: number;
  status: string;
  created_at: string;
  phone_number: string | null;
  delivery_address: string | null;
  county: string | null;
  delivery_instructions: string | null;
  delivery_fee: number | null;
  payment_method: string | null;
  currency: string | null;
  requires_prescription: boolean | null;
  prescription_approved: boolean | null;
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
  prescriptions: {
    id: string;
    status: string;
    image_url: string;
    admin_notes: string | null;
    created_at: string;
  }[];
}

interface AdminPrescriptionOrdersTableProps {
  onStatusUpdate?: (orderId: string, newStatus: string) => void;
}

const AdminPrescriptionOrdersTable: React.FC<AdminPrescriptionOrdersTableProps> = ({ onStatusUpdate }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles (full_name, email),
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
            status,
            image_url,
            admin_notes,
            created_at
          )
        `)
        .eq('requires_prescription', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching prescription orders:', error);
      toast({
        title: "Error",
        description: "Failed to fetch prescription orders",
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
        .update({ status: newStatus as any })
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      });

      // Refresh orders
      fetchOrders();
      
      // Call parent callback
      if (onStatusUpdate) {
        onStatusUpdate(orderId, newStatus);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
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

  const getPrescriptionStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Prescription Orders Found</h3>
          <p className="text-gray-600">No orders requiring prescriptions to display</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">Order #{order.id.slice(-8)}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {order.profiles?.full_name || 'Unknown User'} • {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{formatStatus(order.status)}</span>
                    </Badge>
                    {order.prescriptions.length > 0 && (
                      <Badge className={getPrescriptionStatusColor(order.prescriptions[0].status)}>
                        <FileText className="h-3 w-3 mr-1" />
                        Prescription: {order.prescriptions[0].status}
                      </Badge>
                    )}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Prescription Order Details #{order.id.slice(-8)}</DialogTitle>
                        </DialogHeader>
                        
                        {selectedOrder && (
                          <div className="space-y-6">
                            {/* Order Progress */}
                            <OrderStatusStepper
                              currentStatus={selectedOrder.status}
                              orderTracking={selectedOrder.order_tracking}
                            />

                            {/* Customer & Order Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Customer Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div>
                                    <p className="font-medium">{selectedOrder.profiles?.full_name || 'Unknown User'}</p>
                                    <p className="text-sm text-gray-600">{selectedOrder.profiles?.email || 'No email'}</p>
                                  </div>
                                  {selectedOrder.phone_number && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{selectedOrder.phone_number}</span>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>

                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Order Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div className="flex justify-between">
                                    <span>Total Amount:</span>
                                    <span className="font-medium">{selectedOrder.currency || 'KES'} {selectedOrder.total_amount.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Prescription Approved:</span>
                                    <span className="font-medium">
                                      {selectedOrder.prescription_approved ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Delivery Fee:</span>
                                    <span className="font-medium">{selectedOrder.delivery_fee === 0 ? 'Free' : `${selectedOrder.currency || 'KES'} ${selectedOrder.delivery_fee?.toLocaleString() || 0}`}</span>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>

                            {/* Prescription Information */}
                            {selectedOrder.prescriptions.length > 0 && (
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Prescription Details
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  {selectedOrder.prescriptions.map((prescription, index) => (
                                    <div key={prescription.id} className="space-y-3 border-b pb-3 last:border-b-0">
                                      <div className="flex justify-between items-center">
                                        <Badge className={getPrescriptionStatusColor(prescription.status)}>
                                          {prescription.status}
                                        </Badge>
                                        <span className="text-sm text-gray-600">
                                          {new Date(prescription.created_at).toLocaleDateString()}
                                        </span>
                                      </div>
                                      {prescription.image_url && (
                                        <div>
                                          <img 
                                            src={prescription.image_url} 
                                            alt="Prescription" 
                                            className="max-w-xs rounded-lg border"
                                          />
                                        </div>
                                      )}
                                      {prescription.admin_notes && (
                                        <div>
                                          <p className="font-medium">Admin Notes:</p>
                                          <p className="text-sm text-gray-600">{prescription.admin_notes}</p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </CardContent>
                              </Card>
                            )}

                            {/* Order Items */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Order Items</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-3">
                                  {selectedOrder.order_items.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                                      <div className="flex-1">
                                        <p className="font-medium">{item.products.name}</p>
                                        <p className="text-sm text-gray-600">
                                          Qty: {item.quantity} × {selectedOrder.currency || 'KES'} {item.price}
                                        </p>
                                        {item.products.prescription_required && (
                                          <Badge variant="outline" className="text-xs mt-1">
                                            Prescription Required
                                          </Badge>
                                        )}
                                      </div>
                                      <span className="font-medium">
                                        {selectedOrder.currency || 'KES'} {(item.quantity * item.price).toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>

                            {/* Status Update */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg">Update Order Status</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="flex items-center gap-4">
                                  <Select
                                    value={selectedOrder.status}
                                    onValueChange={(value) => handleStatusUpdate(selectedOrder.id, value)}
                                  >
                                    <SelectTrigger className="w-48">
                                      <SelectValue />
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
                                  <p className="text-sm text-gray-600">
                                    Current status: <span className="font-medium">{formatStatus(selectedOrder.status)}</span>
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Amount</p>
                    <p className="font-medium">{order.currency || 'KES'} {order.total_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Items</p>
                    <p className="font-medium">{order.order_items.length} item(s)</p>
                  </div>
                  <div>
                    <p className="text-gray-600">County</p>
                    <p className="font-medium">{order.county || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Prescription</p>
                    <p className="font-medium">
                      {order.prescription_approved ? 'Approved' : 'Pending'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPrescriptionOrdersTable;

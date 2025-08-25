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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'; // Add this import
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
  prescription: boolean | null; // Changed from requires_prescription to prescription
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
        query = query.or('prescription.is.null,prescription.eq.false'); // Changed from requires_prescription to prescription
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

  const getPaymentColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>{order.id.slice(0, 8)}...</TableCell>
              <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
              <TableCell>{order.profiles?.full_name || order.profiles?.email || 'Unknown'}</TableCell>
              <TableCell>{order.currency || 'KES'} {order.total_amount.toFixed(2)}</TableCell>
              <TableCell>
                <Badge className={getStatusColor(order.status)}>
                  {getStatusIcon(order.status)} {formatStatus(order.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={getPaymentColor(order.payment_status)}>
                  {formatStatus(order.payment_status)}
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" onClick={() => setSelectedOrder(order)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {orders.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center">
                No orders found
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Order Details Modal */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details - ID: {selectedOrder?.id.slice(0, 8)}...</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Status Stepper */}
              <OrderStatusStepper 
                currentStatus={selectedOrder.status} 
                tracking={selectedOrder.order_tracking} 
              />

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>Date:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                    <p><strong>Total:</strong> {selectedOrder.currency || 'KES'} {selectedOrder.total_amount.toFixed(2)}</p>
                    <p><strong>Delivery Fee:</strong> {selectedOrder.currency || 'KES'} {selectedOrder.delivery_fee?.toFixed(2) || '0.00'}</p>
                    <p><strong>Payment Method:</strong> {selectedOrder.payment_method || 'N/A'}</p>
                  </div>
                  <div>
                    <p><strong>Status:</strong> {formatStatus(selectedOrder.status)}</p>
                    <p><strong>Payment Status:</strong> {formatStatus(selectedOrder.payment_status)}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Customer & Delivery Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer & Delivery</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p><Phone className="inline h-4 w-4 mr-2" /> {selectedOrder.phone_number || 'N/A'}</p>
                  <p><MapPin className="inline h-4 w-4 mr-2" /> {selectedOrder.delivery_address}, {selectedOrder.county}</p>
                  <p><FileText className="inline h-4 w-4 mr-2" /> Instructions: {selectedOrder.delivery_instructions || 'None'}</p>
                </CardContent>
              </Card>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrder.order_items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.products.name} {item.products.prescription_required && <Badge>Rx</Badge>}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{selectedOrder.currency || 'KES'} {item.price.toFixed(2)}</TableCell>
                          <TableCell>{selectedOrder.currency || 'KES'} {(item.quantity * item.price).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Prescriptions */}
              {selectedOrder.prescriptions && selectedOrder.prescriptions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Prescriptions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedOrder.prescriptions.map((pres) => (
                        <div key={pres.id} className="flex items-center justify-between">
                          <div>
                            <p>ID: {pres.id.slice(0, 8)}...</p>
                            <Badge className={getStatusColor(pres.status)}>{pres.status.toUpperCase()}</Badge>
                          </div>
                          <Button variant="outline" onClick={() => setSelectedPrescription(pres)}>
                            <Image className="h-4 w-4 mr-2" /> View
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Update Controls */}
              <div className="flex gap-4">
                <Select
                  onValueChange={(value) => handleStatusUpdate(selectedOrder.id, value)}
                  defaultValue={selectedOrder.status}
                >
                  <SelectTrigger>
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
                <Select
                  onValueChange={(value) => handlePaymentStatusUpdate(selectedOrder.id, value)}
                  defaultValue={selectedOrder.payment_status}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Update Payment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Prescription Image Modal (unchanged) */}
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
                    <di

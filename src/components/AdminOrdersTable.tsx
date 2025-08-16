import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Eye, MapPin, Phone, Clock, Package, Truck, CheckCircle, FileText, Image } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  onStatusUpdate?: (orderId: string, newStatus: string) => void;
}

const AdminOrdersTable: React.FC<AdminOrdersTableProps> = ({ orderType = 'all', onStatusUpdate }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, [orderType]);

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

      // Filter based on order type
      if (orderType === 'regular') {
        query = query.or('requires_prescription.is.null,requires_prescription.eq.false');
      }

      const { data: ordersData, error } = await query;

      if (error) throw error;

      if (ordersData && ordersData.length > 0) {
        // Fetch profiles separately to avoid join issues
        const userIds = ordersData.map(order => order.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Combine orders with profiles
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

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const paidOrders = orders.filter(order => order.payment_status === 'paid');
  const unpaidOrders = orders.filter(order => order.payment_status !== 'paid');

  return (
    <div className="space-y-4">
      <Tabs defaultValue="paid">
        <TabsList>
          <TabsTrigger value="paid">Paid Orders ({paidOrders.length})</TabsTrigger>
          <TabsTrigger value="unpaid">Unpaid Orders ({unpaidOrders.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="paid">
          {paidOrders.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Paid Orders Found</h3>
              <p className="text-gray-600">No paid {orderType === 'regular' ? 'regular' : ''} orders to display</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {paidOrders.map((order) => (
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
                        <Badge className={getPaymentStatusColor(order.payment_status)}>
                          {formatStatus(order.payment_status)}
                        </Badge>
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
                              <DialogTitle>Order Details #{order.id.slice(-8)}</DialogTitle>
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
                                          <Phone className="h-4 w-4 text-gray-500" />
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
                                        <span>Payment Method:</span>
                                        <span className="font-medium">{selectedOrder.payment_method || 'Not specified'}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Payment Status:</span>
                                        <Badge className={getPaymentStatusColor(selectedOrder.payment_status)}>
                                          {formatStatus(selectedOrder.payment_status)}
                                        </Badge>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Delivery Fee:</span>
                                        <span className="font-medium">{selectedOrder.delivery_fee === 0 ? 'Free' : `${selectedOrder.currency || 'KES'} ${selectedOrder.delivery_fee?.toLocaleString() || 0}`}</span>
                                      </div>
                                    </CardContent>
                                  </Card>
                                </div>

                                {/* Delivery Information */}
                                {selectedOrder.county && (
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg flex items-center gap-2">
                                        <MapPin className="h-5 w-5" />
                                        Delivery Information
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      <div>
                                        <p className="font-medium">County:</p>
                                        <p className="text-sm text-gray-600">{selectedOrder.county}</p>
                                      </div>
                                      {selectedOrder.delivery_address && (
                                        <div>
                                          <p className="font-medium">Address:</p>
                                          <p className="text-sm text-gray-600">{selectedOrder.delivery_address}</p>
                                        </div>
                                      )}
                                      {selectedOrder.delivery_instructions && (
                                        <div>
                                          <p className="font-medium">Delivery Instructions:</p>
                                          <p className="text-sm text-gray-600">{selectedOrder.delivery_instructions}</p>
                                        </div>
                                      )}
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

                                {/* Prescriptions Section */}
                                {selectedOrder.requires_prescription && selectedOrder.prescriptions && selectedOrder.prescriptions.length > 0 && (
                                  <Card>
                                    <CardHeader>
                                      <CardTitle className="text-lg flex items-center gap-2">
                                        <FileText className="h-5 w-5" />
                                        Prescriptions
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-3">
                                        {selectedOrder.prescriptions.map((prescription) => (
                                          <div key={prescription.id} className="border rounded-lg p-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <Badge className={getStatusColor(prescription.status)}>
                                                {prescription.status.toUpperCase()}
                                              </Badge>
                                              <span className="text-xs text-gray-500">
                                                {new Date(prescription.created_at).toLocaleDateString()}
                                              </span>
                                            </div>
                                            
                                            <div className="flex gap-3">
                                              <img 
                                                src={prescription.image_url} 
                                                alt="Prescription"
                                                className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                                                onClick={() => setSelectedPrescription(prescription)}
                                              />
                                              <div className="flex-1 min-w-0">
                                                {prescription.admin_notes && (
                                                  <p className="text-sm text-gray-600 mb-2">
                                                    <span className="font-medium">Notes:</span> {prescription.admin_notes}
                                                  </p>
                                                )}
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => setSelectedPrescription(prescription)}
                                                  className="mt-2"
                                                >
                                                  <Image className="h-3 w-3 mr-1" />
                                                  View Prescription
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                )}

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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="unpaid">
            {unpaidOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Unpaid Orders Found</h3>
                <p className="text-gray-600">No unpaid {orderType === 'regular' ? 'regular' : ''} orders to display</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {unpaidOrders.map((order) => (
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
                          <Badge className={getPaymentStatusColor(order.payment_status)}>
                            {formatStatus(order.payment_status)}
                          </Badge>
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
                                <DialogTitle>Order Details #{order.id.slice(-8)}</DialogTitle>
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
                                            <Phone className="h-4 w-4 text-gray-500" />
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
                                          <span>Payment Method:</span>
                                          <span className="font-medium">{selectedOrder.payment_method || 'Not specified'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Payment Status:</span>
                                          <Badge className={getPaymentStatusColor(selectedOrder.payment_status)}>
                                            {formatStatus(selectedOrder.payment_status)}
                                          </Badge>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>Delivery Fee:</span>
                                          <span className="font-medium">{selectedOrder.delivery_fee === 0 ? 'Free' : `${selectedOrder.currency || 'KES'} ${selectedOrder.delivery_fee?.toLocaleString() || 0}`}</span>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>

                                  {/* Delivery Information */}
                                  {selectedOrder.county && (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                          <MapPin className="h-5 w-5" />
                                          Delivery Information
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent className="space-y-3">
                                        <div>
                                          <p className="font-medium">County:</p>
                                          <p className="text-sm text-gray-600">{selectedOrder.county}</p>
                                        </div>
                                        {selectedOrder.delivery_address && (
                                          <div>
                                            <p className="font-medium">Address:</p>
                                            <p className="text-sm text-gray-600">{selectedOrder.delivery_address}</p>
                                          </div>
                                        )}
                                        {selectedOrder.delivery_instructions && (
                                          <div>
                                            <p className="font-medium">Delivery Instructions:</p>
                                            <p className="text-sm text-gray-600">{selectedOrder.delivery_instructions}</p>
                                          </div>
                                        )}
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

                                  {/* Prescriptions Section */}
                                  {selectedOrder.requires_prescription && selectedOrder.prescriptions && selectedOrder.prescriptions.length > 0 && (
                                    <Card>
                                      <CardHeader>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                          <FileText className="h-5 w-5" />
                                          Prescriptions
                                        </CardTitle>
                                      </CardHeader>
                                      <CardContent>
                                        <div className="space-y-3">
                                          {selectedOrder.prescriptions.map((prescription) => (
                                            <div key={prescription.id} className="border rounded-lg p-3">
                                              <div className="flex items-center justify-between mb-2">
                                                <Badge className={getStatusColor(prescription.status)}>
                                                  {prescription.status.toUpperCase()}
                                                </Badge>
                                                <span className="text-xs text-gray-500">
                                                  {new Date(prescription.created_at).toLocaleDateString()}
                                                </span>
                                              </div>
                                              
                                              <div className="flex gap-3">
                                                <img 
                                                  src={prescription.image_url} 
                                                  alt="Prescription"
                                                  className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80"
                                                  onClick={() => setSelectedPrescription(prescription)}
                                                />
                                                <div className="flex-1 min-w-0">
                                                  {prescription.admin_notes && (
                                                    <p className="text-sm text-gray-600 mb-2">
                                                      <span className="font-medium">Notes:</span> {prescription.admin_notes}
                                                    </p>
                                                  )}
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setSelectedPrescription(prescription)}
                                                    className="mt-2"
                                                  >
                                                    <Image className="h-3 w-3 mr-1" />
                                                    View Prescription
                                                  </Button>
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  )}

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
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Prescription Image Modal */}
      {selectedPrescription && (
        <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Prescription Image</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <img 
                src={selectedPrescription.image_url} 
                alt="Prescription"
                className="w-full max-h-96 object-contain rounded"
              />
              <div className="text-sm space-y-2">
                <div>
                  <span className="font-medium">Status:</span> 
                  <Badge className={`ml-2 ${getStatusColor(selectedPrescription.status)}`}>
                    {selectedPrescription.status.toUpperCase()}
                  </Badge>
                </div>
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
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminOrdersTable;

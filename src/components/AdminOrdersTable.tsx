import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Eye, Clock, Package, Truck, CheckCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrderStatusStepper from './OrderStatusStepper';
import { Input } from '@/components/ui/input';

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

const validOrderStatuses = ['pending','confirmed','processing','shipped','out_for_delivery','delivered','cancelled'];

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

      if (orderType === 'regular') {
        query = query.or('requires_prescription.is.null,requires_prescription.eq.false');
      }

      const { data: ordersData, error } = await query;
      if (error) throw error;

      if (ordersData && ordersData.length > 0) {
        const userIds = ordersData.map(order => order.user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);

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
      toast({ title: "Error", description: "Failed to fetch orders", variant: "destructive" });
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

      toast({ title: "Success", description: `Order status updated to ${newStatus}` });
      fetchOrders(); // Auto-refresh after status change
      if (onStatusUpdate) onStatusUpdate(orderId, newStatus);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({ title: "Error", description: "Failed to update order status", variant: "destructive" });
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

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
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

  const formatStatus = (status: string) =>
    status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  if (loading) return <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

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
          {paidOrders.length === 0 ? <div className="text-center py-8">No Paid Orders Found</div> :
            <div className="grid gap-4">{paidOrders.map(order => (
              <OrderCard key={order.id} order={order} getStatusColor={getStatusColor} getPaymentStatusColor={getPaymentStatusColor} getStatusIcon={getStatusIcon} formatStatus={formatStatus} setSelectedOrder={setSelectedOrder} setSelectedPrescription={setSelectedPrescription} handleStatusUpdate={handleStatusUpdate} fetchOrders={fetchOrders} />
            ))}</div>}
        </TabsContent>

        <TabsContent value="unpaid">
          {unpaidOrders.length === 0 ? <div className="text-center py-8">No Unpaid Orders Found</div> :
            <div className="grid gap-4">{unpaidOrders.map(order => (
              <OrderCard key={order.id} order={order} getStatusColor={getStatusColor} getPaymentStatusColor={getPaymentStatusColor} getStatusIcon={getStatusIcon} formatStatus={formatStatus} setSelectedOrder={setSelectedOrder} setSelectedPrescription={setSelectedPrescription} handleStatusUpdate={handleStatusUpdate} fetchOrders={fetchOrders} />
            ))}</div>}
        </TabsContent>
      </Tabs>

      {selectedPrescription && (
        <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Prescription Image</DialogTitle></DialogHeader>
            <img src={selectedPrescription.image_url} alt="Prescription" className="w-full max-h-96 object-contain rounded" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

const OrderCard = ({ order, getStatusColor, getPaymentStatusColor, getStatusIcon, formatStatus, setSelectedOrder, setSelectedPrescription, handleStatusUpdate, fetchOrders }: any) => {
  const [newStatus, setNewStatus] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const { toast } = useToast();

  const handleTrackingUpdate = async () => {
    if (!newStatus) return toast({ title: "Error", description: "Please select a new status", variant: "destructive" });
    try {
      const { error: trackError } = await supabase.from('order_tracking').insert({
        order_id: order.id,
        status: newStatus,
        note: newNote || null,
        location: newLocation || null,
        created_at: new Date().toISOString()
      });
      if (trackError) throw trackError;
      await handleStatusUpdate(order.id, newStatus);
      setNewStatus(''); setNewNote(''); setNewLocation('');
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to update tracking status", variant: "destructive" });
    }
  };

  const handleMarkPaid = async () => {
    try {
      const { error } = await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', order.id);
      if (error) throw error;
      toast({ title: "Success", description: "Payment status updated to Paid" });
      fetchOrders(); // Auto-refresh after marking as paid
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to mark as paid", variant: "destructive" });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex justify-between items-start">
        <div>
          <CardTitle className="text-lg">Order #{order.id.slice(-8)}</CardTitle>
          <p className="text-sm text-gray-600 mt-1">{order.profiles?.full_name || 'Unknown User'} • {new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(order.status)}>{getStatusIcon(order.status)} <span className="ml-1">{formatStatus(order.status)}</span></Badge>
          <Badge className={getPaymentStatusColor(order.payment_status)}>{formatStatus(order.payment_status)}</Badge>

          <Dialog>
            <DialogTrigger asChild><Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>View</Button></DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Order Details #{order.id.slice(-8)}</DialogTitle></DialogHeader>
              <div className="space-y-6">
                <OrderStatusStepper currentStatus={order.status} orderTracking={order.order_tracking} />

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Update Tracking Status</h3>
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger><SelectValue placeholder="Select new status" /></SelectTrigger>
                    <SelectContent>
                      {validOrderStatuses.map(s => <SelectItem key={s} value={s}>{s.split('_').map(w => w[0].toUpperCase()+w.slice(1)).join(' ')}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Note (optional)" value={newNote} onChange={(e)=>setNewNote(e.target.value)} />
                  <Input placeholder="Location (optional)" value={newLocation} onChange={(e)=>setNewLocation(e.target.value)} />
                  <Button onClick={handleTrackingUpdate}>Update Status</Button>
                </div>

                {order.payment_status !== 'paid' && (
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">Payment</h3>
                    <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleMarkPaid}>Mark as Paid</Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div><p className="text-gray-600">Total Amount</p><p className="font-medium">{order.currency || 'KES'} {order.total_amount.toLocaleString()}</p></div>
          <div><p className="text-gray-600">Items</p><p className="font-medium">{order.order_items.length} item(s)</p></div>
          <div><p className="text-gray-600">County</p><p className="font-medium">{order.county || 'Not specified'}</p></div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminOrdersTable;

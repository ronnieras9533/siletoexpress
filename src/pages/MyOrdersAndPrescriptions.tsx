
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Package, FileText, Calendar, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface Order {
  id: string;
  created_at: string;
  status: string;
  total_amount: number;
  delivery_address: string;
  county: string;
  requires_prescription: boolean;
  order_items: {
    quantity: number;
    price: number;
    products: {
      name: string;
      brand: string;
    };
  }[];
}

interface Prescription {
  id: string;
  created_at: string;
  status: string;
  image_url: string;
  admin_notes: string | null;
  order_id: string | null;
}

const MyOrdersAndPrescriptions = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchUserData();
  }, [user, navigate]);

  const fetchUserData = async () => {
    try {
      // Fetch user orders
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            price,
            products (name, brand)
          )
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Fetch user prescriptions
      const { data: prescriptionsData, error: prescriptionsError } = await supabase
        .from('prescriptions')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (prescriptionsError) throw prescriptionsError;

      setOrders(ordersData || []);
      setPrescriptions(prescriptionsData || []);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast({
        title: "Error",
        description: "Failed to load your orders and prescriptions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'delivered': return 'bg-blue-100 text-blue-800';
      case 'confirmed': return 'bg-purple-100 text-purple-800';
      case 'processing': return 'bg-orange-100 text-orange-800';
      case 'shipped': return 'bg-indigo-100 text-indigo-800';
      case 'out_for_delivery': return 'bg-teal-100 text-teal-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const viewPrescription = (imageUrl: string) => {
    window.open(imageUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders & Prescriptions</h1>
          <p className="text-gray-600">View and manage your orders and prescriptions</p>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              My Orders ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              My Prescriptions ({prescriptions.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-4">
            {orders.length > 0 ? (
              orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(order.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Amount:</span>
                        <span className="font-medium">KES {order.total_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Delivery Address:</span>
                        <span className="text-sm text-right">{order.delivery_address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">County:</span>
                        <span className="text-sm">{order.county}</span>
                      </div>
                      {order.requires_prescription && (
                        <div className="flex items-center gap-2 text-orange-600 text-sm">
                          <FileText className="h-4 w-4" />
                          <span>Prescription Required</span>
                        </div>
                      )}
                      <div className="border-t pt-3">
                        <p className="text-sm text-gray-600 mb-2">Items:</p>
                        <div className="space-y-1">
                          {order.order_items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.products.name} ({item.products.brand})</span>
                              <span>Qty: {item.quantity} - KES {(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
                  <p className="text-gray-600 mb-4">You haven't placed any orders yet.</p>
                  <Button onClick={() => navigate('/products')}>
                    Start Shopping
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="prescriptions" className="space-y-4">
            {prescriptions.length > 0 ? (
              prescriptions.map((prescription) => (
                <Card key={prescription.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Prescription #{prescription.id.slice(0, 8)}</CardTitle>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(prescription.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      <Badge className={getStatusColor(prescription.status)}>
                        {prescription.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className="text-sm">{prescription.status}</span>
                      </div>
                      {prescription.order_id && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Order ID:</span>
                          <span className="text-sm">{prescription.order_id.slice(0, 8)}</span>
                        </div>
                      )}
                      {prescription.admin_notes && (
                        <div className="border-t pt-3">
                          <p className="text-sm text-gray-600 mb-1">Admin Notes:</p>
                          <p className="text-sm text-gray-800">{prescription.admin_notes}</p>
                        </div>
                      )}
                      <div className="border-t pt-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewPrescription(prescription.image_url)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Prescription
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Prescriptions Yet</h3>
                  <p className="text-gray-600 mb-4">You haven't uploaded any prescriptions yet.</p>
                  <Button onClick={() => navigate('/prescription-upload')}>
                    Upload Prescription
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      <Footer />
    </div>
  );
};

export default MyOrdersAndPrescriptions;

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Eye, CheckCircle, XCircle, FileText, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PrescriptionViewer from './PrescriptionViewer';

interface Order {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  phone_number: string;
  delivery_address: string;
  county: string;
  requires_prescription: boolean;
  prescription_approved: boolean;
  profiles: {
    full_name: string;
    email: string;
  } | null;
  prescriptions: Array<{
    id: string;
    image_url: string;
    status: string;
    admin_notes: string;
    created_at: string;
  }>;
  order_items: Array<{
    id: string;
    quantity: number;
    price: number;
    products: {
      name: string;
      image_url: string;
    };
  }>;
}

interface AdminPrescriptionOrdersTableProps {
  onStatusUpdate: (orderId: string, newStatus: string) => void;
}

const AdminPrescriptionOrdersTable: React.FC<AdminPrescriptionOrdersTableProps> = ({
  onStatusUpdate
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          prescriptions (
            id,
            image_url,
            status,
            admin_notes,
            created_at
          ),
          order_items (
            id,
            quantity,
            price,
            products (name, image_url)
          )
        `)
        .eq('requires_prescription', true)
        .order('created_at', { ascending: false });

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
          profiles: profilesData?.find(profile => profile.id === order.user_id) || 
                   { full_name: 'Unknown', email: 'unknown@example.com' }
        })) as Order[];
        
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
    } catch (error) {
      console.error('Error updating prescription:', error);
      toast({
        title: "Error",
        description: "Failed to update prescription",
        variant: "destructive"
      });
    }
  };

  const handleViewPrescription = (order: Order) => {
    if (order.prescriptions && order.prescriptions.length > 0) {
      // If there's only one prescription, open it directly
      if (order.prescriptions.length === 1) {
        setSelectedPrescription(order.prescriptions[0]);
      } else {
        // If multiple prescriptions, open the first one (could be enhanced to show a list)
        setSelectedPrescription(order.prescriptions[0]);
      }
    } else {
      toast({
        title: "No Prescription",
        description: "No prescription has been uploaded for this order",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'delivered': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading orders...</div>;
  }

  return (
    <>
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No prescription orders found
          </div>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="border">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">Order #{order.id.slice(0, 8)}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {order.profiles?.full_name || 'Unknown'} • {order.profiles?.email || 'unknown@example.com'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.toUpperCase()}
                    </Badge>
                    {order.prescription_approved ? (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Prescription Approved
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        <FileText className="h-3 w-3 mr-1" />
                        Prescription Pending
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Order Details */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Order Items</h4>
                      <div className="space-y-2">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                            {item.products?.image_url && (
                              <img 
                                src={item.products.image_url} 
                                alt={item.products.name}
                                className="w-10 h-10 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.products?.name}</p>
                              <p className="text-xs text-gray-500">
                                Qty: {item.quantity} × KES {Number(item.price).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Total:</span>
                        <p>KES {Number(order.total_amount).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="font-medium">Phone:</span>
                        <p>{order.phone_number}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="font-medium">Delivery Address:</span>
                        <p>{order.delivery_address}</p>
                        {order.county && <p className="text-gray-500">{order.county}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Prescriptions */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Prescriptions</h4>
                    {order.prescriptions && order.prescriptions.length > 0 ? (
                      <div className="space-y-3">
                        {order.prescriptions.map((prescription) => (
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
                                {prescription.status === 'pending' && (
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handlePrescriptionAction(prescription.id, 'approve')}
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handlePrescriptionAction(prescription.id, 'reject')}
                                    >
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No prescriptions uploaded</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t">
                  <div className="flex flex-col sm:flex-row gap-4 justify-between">
                    <Button
                      variant="outline"
                      onClick={() => handleViewPrescription(order)}
                      className="flex-1 sm:flex-none"
                      disabled={!order.prescriptions || order.prescriptions.length === 0}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Prescription
                    </Button>
                    
                    <div className="flex gap-2">
                      <select
                        value={order.status}
                        onChange={(e) => onStatusUpdate(order.id, e.target.value)}
                        className="px-3 py-2 border rounded-md text-sm"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="out_for_delivery">Out for Delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Prescription Viewer Modal */}
      <PrescriptionViewer
        prescription={selectedPrescription}
        isOpen={!!selectedPrescription}
        onClose={() => setSelectedPrescription(null)}
        onStatusUpdate={handlePrescriptionAction}
      />
    </>
  );
};

export default AdminPrescriptionOrdersTable;

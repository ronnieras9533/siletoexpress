
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Truck, Package, CheckCircle, Clock, MapPin } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OrderStatusStepper from '@/components/OrderStatusStepper';

const TrackOrder = () => {
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get('order_id') || '');
  const [searchOrderId, setSearchOrderId] = useState(orderId);

  const { data: orderData, isLoading, error } = useQuery({
    queryKey: ['trackOrder', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(*, products(name, image_url)),
          order_tracking(*)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      return order;
    },
    enabled: !!orderId,
  });

  const handleSearch = () => {
    setOrderId(searchOrderId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'processing':
        return 'bg-orange-100 text-orange-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'out_for_delivery':
        return 'bg-indigo-100 text-indigo-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Track Your Order</h1>

          {/* Search Section */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Enter Order ID
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="Enter your order ID..."
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSearch} disabled={!searchOrderId}>
                  Track Order
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading order details...</p>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-red-600">Order not found or you don't have access to this order.</p>
              </CardContent>
            </Card>
          )}

          {/* Order Details */}
          {orderData && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Order #{orderData.id.slice(0, 8)}</CardTitle>
                      <p className="text-gray-600">
                        Placed on {new Date(orderData.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(orderData.status)}>
                      {orderData.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="font-medium text-gray-900">Total Amount</p>
                      <p className="text-lg font-bold text-blue-600">
                        KES {orderData.total_amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Payment Method</p>
                      <p className="text-gray-600">{orderData.payment_method || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Delivery Address</p>
                      <p className="text-gray-600">{orderData.delivery_address || 'Not specified'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Status Stepper */}
              <OrderStatusStepper 
                currentStatus={orderData.status} 
                orderTracking={orderData.order_tracking || []}
              />

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderData.order_items?.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-4 p-4 border rounded-lg">
                        {item.products?.image_url && (
                          <img 
                            src={item.products.image_url} 
                            alt={item.products.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium">{item.products?.name}</h3>
                          <p className="text-gray-600">Quantity: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">KES {(item.price * item.quantity).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Tracking Timeline */}
              {orderData.order_tracking && orderData.order_tracking.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Truck className="h-5 w-5" />
                      Tracking Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {orderData.order_tracking
                        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((tracking: any) => (
                          <div key={tracking.id} className="flex items-start gap-4 p-4 border-l-4 border-blue-200">
                            <div className="flex-shrink-0">
                              <CheckCircle className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium">
                                    {tracking.status.replace('_', ' ').toUpperCase()}
                                  </p>
                                  {tracking.note && (
                                    <p className="text-gray-600">{tracking.note}</p>
                                  )}
                                  {tracking.location && (
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                      <MapPin className="h-4 w-4" />
                                      {tracking.location}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right text-sm text-gray-500">
                                  <p>{new Date(tracking.created_at).toLocaleDateString()}</p>
                                  <p>{new Date(tracking.created_at).toLocaleTimeString()}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TrackOrder;

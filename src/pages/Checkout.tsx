
import React, { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, CreditCard, AlertCircle, Smartphone } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { mpesaService } from '@/services/mpesaService';

const Checkout = () => {
  const { items, getTotalPrice, hasPrescriptionItems, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    city: '',
    notes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleMPESAPayment = async (orderId: string, totalAmount: number) => {
    setPaymentLoading(true);
    try {
      if (!mpesaService.validatePhoneNumber(formData.phone)) {
        throw new Error('Please enter a valid M-PESA phone number (e.g., 0700123456 or 254700123456)');
      }

      const paymentData = {
        amount: totalAmount,
        phoneNumber: mpesaService.formatPhoneNumber(formData.phone),
        orderId: orderId,
        accountReference: `Order-${orderId.slice(0, 8)}`,
        transactionDesc: `Payment for Sileto Express Order ${orderId.slice(0, 8)}`
      };

      const response = await mpesaService.initiateSTKPush(paymentData);

      if (response.success && response.checkoutRequestID) {
        // Create payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            order_id: orderId,
            method: 'M-PESA',
            amount: totalAmount,
            status: 'pending'
          });

        if (paymentError) throw paymentError;

        toast({
          title: "Payment Initiated",
          description: "Please check your phone and enter your M-PESA PIN to complete the payment.",
        });

        // Poll for payment status
        setTimeout(() => checkPaymentStatus(response.checkoutRequestID!, orderId), 5000);
      } else {
        throw new Error(response.error || 'Failed to initiate M-PESA payment');
      }
    } catch (error) {
      console.error('M-PESA payment error:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to process M-PESA payment",
        variant: "destructive"
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const checkPaymentStatus = async (checkoutRequestID: string, orderId: string) => {
    try {
      const statusResponse = await mpesaService.checkPaymentStatus(checkoutRequestID);
      
      if (statusResponse.resultCode === '0') {
        // Payment successful
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'completed',
            mpesa_code: statusResponse.mpesaReceiptNumber
          })
          .eq('order_id', orderId);

        if (updateError) throw updateError;

        // Update order status
        await supabase
          .from('orders')
          .update({
            status: 'paid',
            mpesa_receipt_number: statusResponse.mpesaReceiptNumber
          })
          .eq('id', orderId);

        // Create delivery record
        await supabase
          .from('deliveries')
          .insert({
            order_id: orderId,
            status: 'pending'
          });

        clearCart();
        navigate('/order-success', { 
          state: { 
            orderId: orderId,
            hasPrescriptionItems: hasPrescriptionItems(),
            totalAmount: getTotalPrice() + (getTotalPrice() >= 2000 ? 0 : 200),
            mpesaReceiptNumber: statusResponse.mpesaReceiptNumber
          } 
        });

        toast({
          title: "Payment Successful!",
          description: `Payment completed. M-PESA Receipt: ${statusResponse.mpesaReceiptNumber}`,
        });
      } else {
        // Payment failed or cancelled
        await supabase
          .from('payments')
          .update({ status: 'failed' })
          .eq('order_id', orderId);

        toast({
          title: "Payment Failed",
          description: statusResponse.resultDesc || "Payment was not completed",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Payment status check error:', error);
      toast({
        title: "Payment Status Error",
        description: "Could not verify payment status. Please contact support.",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }

    setLoading(true);
    try {
      const totalAmount = getTotalPrice() + (getTotalPrice() >= 2000 ? 0 : 200);
      
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: totalAmount,
          phone_number: formData.phone,
          delivery_address: `${formData.address}, ${formData.city}`,
          status: 'pending'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Initiate M-PESA payment
      await handleMPESAPayment(order.id, totalAmount);

    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "Failed to create order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const deliveryFee = getTotalPrice() >= 2000 ? 0 : 200;
  const totalAmount = getTotalPrice() + deliveryFee;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/cart')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Cart
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Checkout Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Payment & Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="phone">M-PESA Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="0700123456 or 254700123456"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Enter the phone number registered with M-PESA
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="address">Delivery Address</Label>
                    <Input
                      id="address"
                      name="address"
                      placeholder="Enter your delivery address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="Enter your city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Input
                      id="notes"
                      name="notes"
                      placeholder="Any special instructions..."
                      value={formData.notes}
                      onChange={handleInputChange}
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading || paymentLoading}>
                    {loading ? (
                      'Creating Order...'
                    ) : paymentLoading ? (
                      'Processing Payment...'
                    ) : (
                      <>
                        <Smartphone className="mr-2 h-4 w-4" />
                        Pay with M-PESA - KES {totalAmount.toLocaleString()}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity} × KES {item.price}
                      </p>
                      {item.prescription_required && (
                        <div className="flex items-center gap-1 text-red-600 text-sm mt-1">
                          <AlertCircle size={14} />
                          <span>Prescription Required</span>
                        </div>
                      )}
                    </div>
                    <span className="font-medium">
                      KES {(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>KES {getTotalPrice().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span>{deliveryFee === 0 ? 'Free' : `KES ${deliveryFee}`}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span className="text-blue-600">KES {totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {hasPrescriptionItems() && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <AlertCircle size={16} />
                      <span className="font-medium">Prescription Required</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      Items requiring prescription will be verified before delivery
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800">
                    <Smartphone size={16} />
                    <span className="font-medium">M-PESA Payment</span>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    You will receive an STK push notification on your phone to complete the payment
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Checkout;

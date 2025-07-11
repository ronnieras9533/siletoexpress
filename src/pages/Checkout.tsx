
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
import { ArrowLeft, CreditCard, AlertCircle, Smartphone, Upload } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const Checkout = () => {
  const { items, getTotalPrice, hasPrescriptionItems, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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

  const simulatePayment = async (orderId: string, totalAmount: number) => {
    // Simulate M-PESA payment process
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          mpesaReceiptNumber: `MP${Date.now()}${Math.floor(Math.random() * 1000)}`
        });
      }, 2000);
    });
  };

  const handleUploadPrescription = () => {
    navigate('/prescription-upload', {
      state: { fromCheckout: true }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if prescription items require prescription upload
    if (hasPrescriptionItems()) {
      toast({
        title: "Prescription Required",
        description: "Please upload your prescription before proceeding with the order.",
        variant: "destructive"
      });
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

      // Simulate payment processing
      toast({
        title: "Processing Payment",
        description: "Please wait while we process your M-PESA payment...",
      });

      const paymentResult: any = await simulatePayment(order.id, totalAmount);

      if (paymentResult.success) {
        // Update order status
        await supabase
          .from('orders')
          .update({
            status: 'approved',
            mpesa_receipt_number: paymentResult.mpesaReceiptNumber
          })
          .eq('id', order.id);

        clearCart();
        navigate('/order-success', { 
          state: { 
            orderId: order.id,
            hasPrescriptionItems: hasPrescriptionItems(),
            totalAmount: totalAmount,
            mpesaReceiptNumber: paymentResult.mpesaReceiptNumber
          } 
        });

        toast({
          title: "Payment Successful!",
          description: `Payment completed. M-PESA Receipt: ${paymentResult.mpesaReceiptNumber}`,
        });
      } else {
        throw new Error('Payment failed');
      }

    } catch (error) {
      console.error('Error creating order:', error);
      toast({
        title: "Error",
        description: "Failed to process order. Please try again.",
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

                  {hasPrescriptionItems() && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-red-800 mb-2">
                        <AlertCircle size={16} />
                        <span className="font-medium">Prescription Required</span>
                      </div>
                      <p className="text-sm text-red-700 mb-3">
                        Your cart contains prescription items. Please upload your prescription before proceeding.
                      </p>
                      <Button
                        type="button"
                        onClick={handleUploadPrescription}
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Prescription
                      </Button>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading || hasPrescriptionItems()}
                  >
                    {loading ? (
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
                      Items requiring prescription must be verified before checkout
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

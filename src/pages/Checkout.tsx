
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
import { ArrowLeft, CreditCard, AlertCircle, Smartphone, MessageCircle } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OrderPrescriptionUpload from '@/components/OrderPrescriptionUpload';
import CardPaymentButton from '@/components/CardPaymentButton';

const Checkout = () => {
  const { items, getTotalPrice, hasPrescriptionItems, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPrescriptionUpload, setShowPrescriptionUpload] = useState(false);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
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

  const handlePrescriptionUploaded = (uploadedPrescriptionId: string) => {
    setPrescriptionId(uploadedPrescriptionId);
    setShowPrescriptionUpload(false);
    toast({
      title: "Prescription uploaded!",
      description: "You can now proceed with your order.",
    });
  };

  const handleWhatsAppHelp = () => {
    const orderSummary = items.map(item => 
      `• ${item.name} (Qty: ${item.quantity}) - KES ${(item.price * item.quantity).toLocaleString()}`
    ).join('\n');
    
    const message = `Hi SiletoExpress, I need help with my checkout:

ORDER SUMMARY:
${orderSummary}

Subtotal: KES ${getTotalPrice().toLocaleString()}
Delivery: ${deliveryFee === 0 ? 'Free' : `KES ${deliveryFee}`}
Total: KES ${totalAmount.toLocaleString()}

${hasPrescriptionItems() ? '⚠️ This order includes prescription items' : ''}

Please assist me with completing this order.`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=254718925368&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const createOrder = async () => {
    const totalAmount = getTotalPrice() + (getTotalPrice() >= 2000 ? 0 : 200);
    
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user!.id,
        total_amount: totalAmount,
        phone_number: formData.phone,
        delivery_address: `${formData.address}, ${formData.city}`,
        status: 'pending',
        payment_method: paymentMethod,
        currency: 'KES'
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

    // If there's a prescription, link it to the order
    if (prescriptionId) {
      await supabase
        .from('prescriptions')
        .update({ order_id: order.id })
        .eq('id', prescriptionId);
    }

    return order;
  };

  const handleMpesaPayment = async () => {
    setLoading(true);
    try {
      const order = await createOrder();
      const totalAmount = getTotalPrice() + (getTotalPrice() >= 2000 ? 0 : 200);

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

  const handleCardPaymentSuccess = (transactionData: any) => {
    clearCart();
    toast({
      title: "Payment Successful!",
      description: "Your card payment has been processed successfully.",
    });
  };

  const handleCardPaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }

    // Check if prescription items require prescription upload
    if (hasPrescriptionItems() && !prescriptionId) {
      setShowPrescriptionUpload(true);
      return;
    }

    if (paymentMethod === 'mpesa') {
      await handleMpesaPayment();
    }
    // Card payment is handled by the CardPaymentButton component
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
  const prescriptionItems = items.filter(item => item.prescription_required);

  // Show prescription upload if needed
  if (showPrescriptionUpload) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={() => setShowPrescriptionUpload(false)}
              className="flex items-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Checkout
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Upload Prescription</h1>
          </div>

          <div className="max-w-2xl mx-auto">
            <OrderPrescriptionUpload
              onPrescriptionUploaded={handlePrescriptionUploaded}
              onCancel={() => setShowPrescriptionUpload(false)}
              prescriptionItems={prescriptionItems}
            />
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

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
                  <CreditCard className="h-5 w-5" />
                  Payment & Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
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
                      {paymentMethod === 'mpesa' ? 'Enter the phone number registered with M-PESA' : 'Your contact phone number'}
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

                  {hasPrescriptionItems() && !prescriptionId && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-800 mb-2">
                        <AlertCircle size={16} />
                        <span className="font-medium">Prescription Required</span>
                      </div>
                      <p className="text-sm text-blue-700 mb-3">
                        Your cart contains prescription items. You need to upload your prescription to continue.
                      </p>
                    </div>
                  )}

                  {hasPrescriptionItems() && prescriptionId && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-800 mb-2">
                        <AlertCircle size={16} />
                        <span className="font-medium">Prescription Uploaded</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Your prescription has been uploaded successfully. You can now proceed with payment.
                      </p>
                    </div>
                  )}

                  {/* Payment Method Selection */}
                  <div className="space-y-3">
                    <Label>Select Payment Method</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        type="button"
                        variant={paymentMethod === 'mpesa' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('mpesa')}
                        className="flex items-center gap-2"
                      >
                        <Smartphone size={16} />
                        M-PESA
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMethod === 'card' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('card')}
                        className="flex items-center gap-2"
                      >
                        <CreditCard size={16} />
                        Card
                      </Button>
                    </div>
                  </div>

                  {/* Payment Buttons */}
                  {paymentMethod === 'mpesa' ? (
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading || (hasPrescriptionItems() && !prescriptionId)}
                    >
                      {loading ? (
                        'Processing Payment...'
                      ) : hasPrescriptionItems() && !prescriptionId ? (
                        'Upload Prescription First'
                      ) : (
                        <>
                          <Smartphone className="mr-2 h-4 w-4" />
                          Pay with M-PESA - KES {totalAmount.toLocaleString()}
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      {(hasPrescriptionItems() && !prescriptionId) ? (
                        <Button 
                          type="button"
                          onClick={() => setShowPrescriptionUpload(true)}
                          className="w-full"
                        >
                          Upload Prescription First
                        </Button>
                      ) : (
                        <CardPaymentButton
                          amount={totalAmount}
                          currency="KES"
                          customerInfo={{
                            email: user.email || '',
                            phone: formData.phone,
                            name: user.user_metadata?.full_name || 'Customer'
                          }}
                          formData={formData}
                          prescriptionId={prescriptionId}
                          onSuccess={handleCardPaymentSuccess}
                          onError={handleCardPaymentError}
                        />
                      )}
                    </div>
                  )}
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
                        <div className="flex items-center gap-1 text-orange-600 text-sm mt-1">
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

                {paymentMethod === 'mpesa' ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Smartphone size={16} />
                      <span className="font-medium">M-PESA Payment</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      You will receive an STK push notification on your phone to complete the payment
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <CreditCard size={16} />
                      <span className="font-medium">Card Payment</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Secure payment with Visa, Mastercard, and other major cards
                    </p>
                  </div>
                )}

                {/* WhatsApp Help Button */}
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleWhatsAppHelp}
                    className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  >
                    <MessageCircle size={16} className="mr-2" />
                    Need Help? Chat with us on WhatsApp
                  </Button>
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

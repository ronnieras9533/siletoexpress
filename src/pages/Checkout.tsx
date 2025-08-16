import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, MapPin, Phone, FileText, CreditCard } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import KenyaCountiesSelect from '@/components/KenyaCountiesSelect';
import OrderPrescriptionUpload from '@/components/OrderPrescriptionUpload';
import MpesaPaymentButton from '@/components/payments/MpesaPaymentButton';
import PesapalPaymentButton from '@/components/PesapalPaymentButton';

const Checkout = () => {
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [county, setCounty] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [prescriptionFiles, setPrescriptionFiles] = useState<File[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('mpesa');

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + deliveryFee;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const needsPrescription = items.some(item => item.prescription_required);
    setRequiresPrescription(needsPrescription);

    if (county) {
      calculateDeliveryFee();
    } else {
      setDeliveryFee(0); // Default to 0 when no county is selected
    }
  }, [user, navigate, items, county]); // Removed subtotal from deps as it's derived from items

  const calculateDeliveryFee = () => {
    console.log('Calculating delivery fee for county:', county); // Debug log
    const countyLower = county.trim().toLowerCase();
    const neighboringCounties = ['kiambu', 'machakos', 'kajiado'];
    let fee = 300; // Default for other counties
    if (countyLower === 'nairobi') {
      fee = 0;
    } else if (neighboringCounties.includes(countyLower)) {
      fee = 200;
    }
    setDeliveryFee(fee);
  };

  const validateForm = (): boolean => {
    if (!deliveryAddress.trim()) {
      toast({ title: "Error", description: "Delivery address is required", variant: "destructive" });
      return false;
    }
    if (!county) {
      toast({ title: "Error", description: "County is required", variant: "destructive" });
      return false;
    }
    if (!phoneNumber.trim()) {
      toast({ title: "Error", description: "Phone number is required", variant: "destructive" });
      return false;
    }
    if (!/^\+?\d{10,14}$/.test(phoneNumber.trim())) {
      toast({ title: "Error", description: "Please enter a valid phone number (10-14 digits)", variant: "destructive" });
      return false;
    }
    if (!email.trim()) {
      toast({ title: "Error", description: "Email address is required", variant: "destructive" });
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      toast({ title: "Error", description: "Please enter a valid email address", variant: "destructive" });
      return false;
    }
    if (requiresPrescription && prescriptionFiles.length === 0) {
      toast({ title: "Error", description: "Prescription files are required for this order", variant: "destructive" });
      return false;
    }
    return true;
  };

  const createOrder = async () => {
    if (!user || !validateForm()) return null;

    setLoading(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: total,
          delivery_address: deliveryAddress,
          county: county,
          phone_number: phoneNumber,
          email: email,
          delivery_instructions: deliveryInstructions,
          delivery_fee: deliveryFee,
          requires_prescription: requiresPrescription,
          payment_method: paymentMethod,
          currency: 'KES'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      if (requiresPrescription && prescriptionFiles.length > 0) {
        await handlePrescriptionUpload(order.id);
      }
      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      toast({ title: "Error", description: `Failed to create order: ${error.message || 'Unknown error'}. Please try again.`, variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handlePrescriptionUpload = async (orderId: string) => {
    if (prescriptionFiles.length === 0) return;
    try {
      for (const file of prescriptionFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${orderId}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('prescriptions').upload(fileName, file);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('prescriptions').getPublicUrl(fileName);
        await supabase.from('prescriptions').insert({
          user_id: user!.id,
          order_id: orderId,
          image_url: data.publicUrl,
          status: 'pending'
        });
      }
    } catch (error) {
      console.error('Error uploading prescriptions:', error);
      toast({ title: "Warning", description: "Order created but prescription upload failed. Please contact support.", variant: "destructive" });
    }
  };

  const handlePaymentSuccess = async (receiptNumber?: string, order?: any) => {
    if (order) {
      await supabase
        .from('orders')
        .update({ payment_status: 'paid' })
        .eq('id', order.id);
    }
    toast({
      title: "Payment Successful",
      description: receiptNumber ? `Payment completed. Receipt: ${receiptNumber}` : "Your payment has been processed successfully."
    });
    clearCart();
    navigate('/order-success');
  };

  const handlePaymentError = (error: string) => {
    toast({ title: "Payment Failed", description: error, variant: "destructive" });
  };

  const handlePrescriptionUploaded = (file: File) => {
    setPrescriptionFiles([file]);
    toast({ title: "Success", description: "Prescription uploaded successfully" });
  };

  const handlePrescriptionCancel = () => {
    setPrescriptionFiles([]);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h2>
            <p className="text-gray-600 mb-6">Add some products to your cart to continue with checkout.</p>
            <Button onClick={() => navigate('/products')}>
              Start Shopping
            </Button>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">Complete your order details</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Delivery Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" />Delivery Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">Delivery Address *</Label>
                  <Textarea id="address" placeholder="Enter your full delivery address" value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} rows={3} />
                </div>
                <div>
                  <Label htmlFor="county">County *</Label>
                  <KenyaCountiesSelect value={county} onValueChange={(value) => {
                    setCounty(value);
                    console.log('Selected county:', value); // Debug log for county value
                  }} />
                </div>
                <div>
                  <Label htmlFor="instructions">Delivery Instructions (Optional)</Label>
                  <Textarea id="instructions" placeholder="Any special delivery instructions..." value={deliveryInstructions} onChange={(e) => setDeliveryInstructions(e.target.value)} rows={2} />
                </div>
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" />Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" type="tel" placeholder="e.g. 0712345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </CardContent>
            </Card>

            {/* Prescription Upload */}
            {requiresPrescription && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Prescription Required<Badge variant="destructive">Required</Badge></CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">Some items in your cart require a prescription. Please upload your prescription files below.</p>
                  <OrderPrescriptionUpload onPrescriptionUploaded={handlePrescriptionUploaded} onCancel={handlePrescriptionCancel} prescriptionItems={items.filter(item => item.prescription_required).map(item => ({ id: item.id, name: item.name }))} />
                </CardContent>
              </Card>
            )}

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" />Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input type="radio" name="payment" value="mpesa" checked={paymentMethod === 'mpesa'} onChange={(e) => setPaymentMethod(e.target.value)} className="text-blue-600" />
                    <span>M-Pesa</span>
                    <Badge variant="secondary">Recommended</Badge>
                  </label>
                  <label className="flex items-center space-x-3">
                    <input type="radio" name="payment" value="pesapal" checked={paymentMethod === 'pesapal'} onChange={(e) => setPaymentMethod(e.target.value)} className="text-blue-600" />
                    <span>Pesapal (Card/Mobile Money)</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity} × KES {item.price.toLocaleString()}</p>
                        {item.prescription_required && <Badge variant="destructive" className="text-xs mt-1">Prescription Required</Badge>}
                      </div>
                      <p className="font-medium">KES {(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between"><span>Subtotal</span><span>KES {subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Delivery Fee</span><span>{deliveryFee === 0 ? 'Free (Nairobi)' : `KES ${deliveryFee.toLocaleString()}`}</span></div>
                  {deliveryFee === 200 && <p className="text-xs text-green-600">Discounted delivery for neighboring counties</p>}
                  <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>KES {total.toLocaleString()}</span></div>
                </div>

                <div className="space-y-2">
                  {paymentMethod === 'mpesa' ? (
                    <MpesaPaymentButton
                      paymentData={{
                        amount: total,
                        phoneNumber: phoneNumber,
                        orderId: '',
                        accountReference: `Order-${Date.now()}`,
                        transactionDesc: 'SiletoExpress Order Payment'
                      }}
                      onSuccess={(receiptNumber) => handlePaymentSuccess(receiptNumber)}
                      onError={handlePaymentError}
                      beforePay={async () => {
                        const order = await createOrder();
                        if (!order) throw new Error('Order could not be created.');
                        return { ...order, orderId: order.id };
                      }}
                    />
                  ) : (
                    <PesapalPaymentButton
                      amount={total}
                      currency="KES"
                      customerInfo={{ email: email, phone: phoneNumber, name: user?.email || 'Customer' }}
                      formData={{ phone: phoneNumber, address: deliveryAddress, city: county, county: county, notes: deliveryInstructions }}
                      prescriptionId={null}
                      onSuccess={(receiptNumber) => handlePaymentSuccess(receiptNumber)}
                      onError={handlePaymentError}
                      paymentType="card"
                      beforePay={async () => {
                        const order = await createOrder();
                        if (!order) throw new Error('Order could not be created.');
                        return order;
                      }}
                    />
                  )}
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

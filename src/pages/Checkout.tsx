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

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal + deliveryFee;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const needsPrescription = items.some(item => item.prescription_required);
    setRequiresPrescription(needsPrescription);

    if (county) calculateDeliveryFee();
  }, [user, navigate, items, county, subtotal]);

  const calculateDeliveryFee = async () => {
    try {
      const { data, error } = await supabase.rpc('calculate_delivery_fee', {
        county_name: county,
        order_total: subtotal,
      });
      if (error) throw error;
      setDeliveryFee(data || 300);
    } catch {
      setDeliveryFee(300);
    }
  };

  const validateForm = (): boolean => {
    if (!deliveryAddress.trim()) {
      toast({ title: "Error", description: "Please enter your delivery address", variant: "destructive" });
      return false;
    }
    if (!county) {
      toast({ title: "Error", description: "Please select your county", variant: "destructive" });
      return false;
    }
    if (!phoneNumber.trim()) {
      toast({ title: "Error", description: "Please enter your phone number", variant: "destructive" });
      return false;
    }
    if (!email.trim()) {
      toast({ title: "Error", description: "Please enter your email address", variant: "destructive" });
      return false;
    }
    if (requiresPrescription && prescriptionFiles.length === 0) {
      toast({ title: "Error", description: "Please upload prescription files", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handlePrescriptionUpload = async (orderId: string) => {
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
          status: 'pending',
        });
      }
    } catch {
      toast({ title: "Warning", description: "Prescription upload failed. Please contact support.", variant: "destructive" });
    }
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
          county,
          phone_number: phoneNumber,
          email,
          delivery_instructions: deliveryInstructions,
          delivery_fee: deliveryFee,
          requires_prescription: requiresPrescription,
          payment_method: paymentMethod,
          currency: 'KES',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) throw itemsError;

      if (requiresPrescription && prescriptionFiles.length > 0) {
        await handlePrescriptionUpload(order.id);
      }
      return order;
    } catch {
      toast({ title: "Error", description: "Failed to create order. Please try again.", variant: "destructive" });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (receiptNumber?: string) => {
    toast({
      title: "Payment Successful",
      description: receiptNumber
        ? `Payment completed. Receipt: ${receiptNumber}`
        : "Your payment has been processed successfully.",
    });
    clearCart();
    navigate('/order-success');
  };

  const handlePaymentError = (error: string) => {
    toast({ title: "Payment Failed", description: error, variant: "destructive" });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add products to your cart to checkout.</p>
          <Button onClick={() => navigate('/products')}>Browse Products</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><MapPin />Delivery Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Textarea placeholder="Full delivery address" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} rows={3} />
              <KenyaCountiesSelect value={county} onValueChange={setCounty} />
              <Textarea placeholder="Special delivery instructions (optional)" value={deliveryInstructions} onChange={e => setDeliveryInstructions(e.target.value)} rows={2} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Phone />Contact Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="0712345678" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
              <Input type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </CardContent>
          </Card>

          {requiresPrescription && (
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText />Prescription Required<Badge variant="destructive">Required</Badge></CardTitle></CardHeader>
              <CardContent>
                <OrderPrescriptionUpload prescriptionItems={items.filter(i => i.prescription_required).map(i => ({ id: i.id, name: i.name }))} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard />Payment Method</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center space-x-3">
                <input type="radio" value="mpesa" checked={paymentMethod === 'mpesa'} onChange={e => setPaymentMethod(e.target.value)} />
                <span>M-Pesa</span><Badge variant="secondary">Recommended</Badge>
              </label>
              <label className="flex items-center space-x-3">
                <input type="radio" value="pesapal" checked={paymentMethod === 'pesapal'} onChange={e => setPaymentMethod(e.target.value)} />
                <span>Pesapal (Card/Mobile Money)</span>
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Right: Summary */}
        <div>
          <Card className="sticky top-6">
            <CardHeader><CardTitle>Order Summary</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex justify-between">
                  <div>
                    <p>{item.name}</p>
                    <p className="text-sm text-gray-600">Qty: {item.quantity} × KES {item.price.toLocaleString()}</p>
                    {item.prescription_required && <Badge variant="destructive" className="text-xs">Prescription Required</Badge>}
                  </div>
                  <p>KES {(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}

              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span>KES {subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>Delivery Fee</span><span>KES {deliveryFee.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold"><span>Total</span><span>KES {total.toLocaleString()}</span></div>
              </div>

              {paymentMethod === 'mpesa' ? (
                <MpesaPaymentButton
                  beforePay={async () => {
                    const order = await createOrder();
                    if (!order) throw new Error('Order creation failed.');
                    return { ...order, orderId: order.id };
                  }}
                  paymentData={{
                    amount: total,
                    phoneNumber,
                    orderId: '',
                    accountReference: `Order-${Date.now()}`,
                    transactionDesc: 'SiletoExpress Order Payment',
                  }}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
              ) : (
                <PesapalPaymentButton
                  beforePay={async () => {
                    const order = await createOrder();
                    if (!order) throw new Error('Order creation failed.');
                    return order;
                  }}
                  amount={total}
                  currency="KES"
                  customerInfo={{ email, phone: phoneNumber, name: user?.email || 'Customer' }}
                  formData={{ phone: phoneNumber, address: deliveryAddress, city: county, county, notes: deliveryInstructions }}
                  prescriptionId={null}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  paymentType="card"
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout;

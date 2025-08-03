import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CreditCard, Smartphone } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoginModal from '@/components/LoginModal';
import MpesaPaymentButton from '@/components/payments/MpesaPaymentButton';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, clearCart, getTotalAmount } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ phone: '', address: '', city: '', county: '', notes: '' });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'mobile'>('mobile');
  const [isFormValid, setIsFormValid] = useState(false);

  const subtotal = getTotalAmount();
  const deliveryFee = formData.county ? calculateDeliveryFee(formData.county, subtotal) : 200;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    setIsFormValid(
      formData.phone.trim() &&
      formData.address.trim() &&
      formData.city.trim() &&
      formData.county
    );
  }, [formData]);

  const validateKenyanPhone = (phone: string) => /^(0|\+254|254)\d{9}$/.test(phone.replace(/\s+/g, ''));

  const handlePaymentSuccess = (txnData: any) => {
    toast({ title: 'Payment successful', description: 'STK push initiated successfully' });
    clearCart();
    navigate('/payment-success', { state: { txnData, formData, total } });
  };

  const handlePaymentError = (err: string) => {
    toast({ title: 'Payment Failed', description: err, variant: 'destructive' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* ...customer & delivery fields omitted for brevity... */}

        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Button onClick={() => setSelectedPaymentMethod('mobile')} variant={selectedPaymentMethod === 'mobile' ? 'default' : 'outline'}>
                <Smartphone className="mr-2 h-4 w-4" />M‑PESA
              </Button>
              <Button onClick={() => setSelectedPaymentMethod('card')} variant={selectedPaymentMethod === 'card' ? 'default' : 'outline'}>
                <CreditCard className="mr-2 h-4 w-4" />Card
              </Button>
            </div>

            {isFormValid && (
              <div className="space-y-4">
                {selectedPaymentMethod === 'mobile' ? (
                  <MpesaPaymentButton
                    paymentData={{ amount: total, phoneNumber: formData.phone, orderId: `ORD_${Date.now()}` }}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                ) : (
                  <PesapalPaymentButton
                    amount={total}
                    currency="KES"
                    customerInfo={{ email: user?.email!, phone: formData.phone, name: user?.user_metadata?.full_name || user?.email! }}
                    formData={formData}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    paymentType="card"
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default Checkout;

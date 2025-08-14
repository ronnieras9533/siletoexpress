import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

interface PesapalPaymentButtonProps {
  amount: number;
  currency: string;
  customerInfo: { email: string; phone: string; name: string };
  formData: { phone: string; address: string; city: string; county: string; notes: string };
  prescriptionId?: string | null;
  beforePay?: () => Promise<{ id: string }>;
  onSuccess: (transactionData: any) => void;
  onError: (error: string) => void;
  paymentType: 'card' | 'mobile';
}

const validateEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validateKenyanPhone = (phone: string): boolean =>
  /^(\+254|254|0)?[17]\d{8}$/.test(phone.replace(/\s/g, ''));

const formatKenyanPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('254')) return cleaned;
  if (cleaned.startsWith('0')) return '254' + cleaned.substring(1);
  if (cleaned.length === 9) return '254' + cleaned;
  return cleaned;
};

const PesapalPaymentButton: React.FC<PesapalPaymentButtonProps> = ({
  amount,
  currency,
  customerInfo,
  formData,
  prescriptionId,
  beforePay,
  onSuccess,
  onError,
  paymentType
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { items, clearCart } = useCart();
  const { user } = useAuth();

  const handlePesapalPayment = async () => {
    if (!user) return onError('User not authenticated');

    if (!validateEmail(customerInfo.email)) return onError('Invalid email address');
    if (!validateKenyanPhone(customerInfo.phone))
      return onError('Invalid phone format. Use 0712345678 or +254712345678');
    if (amount <= 0) return onError('Invalid payment amount');
    if (currency !== 'KES') return onError('Only KES supported');

    setLoading(true);

    try {
      let orderId: string;
      if (beforePay) {
        const orderData = await beforePay();
        if (!orderData?.id) throw new Error('Order creation failed.');
        orderId = orderData.id;
      } else {
        throw new Error('beforePay function not provided.');
      }

      const formattedPhone = formatKenyanPhone(customerInfo.phone);

      const cartItems = items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity,
      }));

      const deliveryInfo = {
        phone: formatKenyanPhone(formData.phone),
        address: formData.address,
        city: formData.city,
        county: formData.county,
        notes: formData.notes,
      };

      const pesapalRequestData = {
        orderId,
        amount: Math.floor(amount * 100) / 100,
        currency,
        email: customerInfo.email.toLowerCase(),
        phone: formattedPhone,
        description: `SiletoExpress Order - ${items.length} items - ${amount} ${currency}`,
        callback_url: `${window.location.origin}/payment-success`,
        cartItems,
        deliveryInfo,
        prescriptionId,
      };

      const { data: pesapalResponse, error: pesapalError } = await supabase.functions
        .invoke('pesapal-payment', {
          body: pesapalRequestData,
          headers: { 'Content-Type': 'application/json' },
        });

      if (pesapalError || !pesapalResponse?.success) {
        throw new Error(pesapalResponse?.message || pesapalError?.message || 'Failed to initiate payment');
      }

      // Save payment tracking info
      localStorage.setItem('pesapal_payment', JSON.stringify({
        trackingId: pesapalResponse.data.order_tracking_id,
        merchantReference: pesapalResponse.data.merchant_reference,
        amount,
        currency,
        userId: user.id,
        orderId,
        timestamp: Date.now(),
      }));

      clearCart();
      toast({ title: "Redirecting to Payment", description: "You'll be redirected to complete payment..." });

      setTimeout(() => {
        window.location.href = pesapalResponse.data.redirect_url;
      }, 1000);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      onError(message);
      toast({ title: "Payment Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const buttonText = paymentType === 'card'
    ? `Pay with Card - ${currency} ${amount.toLocaleString()}`
    : `Pay with M-PESA - ${currency} ${amount.toLocaleString()}`;

  const ButtonIcon = paymentType === 'card' ? CreditCard : Smartphone;

  return (
    <Button
      onClick={handlePesapalPayment}
      disabled={loading}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <ButtonIcon className="mr-2 h-4 w-4" />
          {buttonText}
        </>
      )}
    </Button>
  );
};

export default PesapalPaymentButton;

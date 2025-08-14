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
  customerInfo: {
    email: string;
    phone: string;
    name: string;
  };
  formData: {
    phone: string;
    address: string;
    city: string;
    county: string;
    notes: string;
  };
  prescriptionId?: string | null;
  onSuccess: (transactionData: any) => void;
  onError: (error: string) => void;
  paymentType: 'card' | 'mobile';
  beforePay?: () => Promise<{ orderId: string } | any>; // new hook
}

// Input validation
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

const validateKenyanPhone = (phone: string): boolean => {
  const kenyanPhoneRegex = /^(\+254|254|0)?[17]\d{8}$/;
  return kenyanPhoneRegex.test(phone.replace(/\s/g, ''));
};

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
  onSuccess,
  onError,
  paymentType,
  beforePay
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { items, clearCart } = useCart();
  const { user } = useAuth();

  const handlePesapalPayment = async () => {
    try {
      if (!user) throw new Error('User not authenticated');
      if (!validateEmail(customerInfo.email)) throw new Error('Invalid email address format');
      if (!validateKenyanPhone(customerInfo.phone)) {
        throw new Error('Invalid Kenyan phone number format. Use: 0712345678 or +254712345678');
      }
      if (amount <= 0 || amount > 1000000) throw new Error('Invalid payment amount');
      if (currency !== 'KES') throw new Error('Only Kenyan Shillings (KES) are supported');

      setLoading(true);

      // 1️⃣ Run beforePay if provided
      let orderId: string;
      if (beforePay) {
        const orderInfo = await beforePay();
        if (!orderInfo?.orderId) throw new Error('Order creation failed.');
        orderId = orderInfo.orderId;
      } else {
        orderId = `ORDER_${user.id.substring(0, 8)}_${Date.now()}`;
      }

      const formattedPhone = formatKenyanPhone(customerInfo.phone);

      // Prepare cart items
      const cartItems = items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity
      }));

      const deliveryInfo = {
        phone: formatKenyanPhone(formData.phone),
        address: formData.address,
        city: formData.city,
        county: formData.county,
        notes: formData.notes
      };

      // Call edge function
      const pesapalRequestData = {
        orderId,
        amount: Math.floor(amount * 100) / 100,
        currency,
        email: customerInfo.email.toLowerCase(),
        phone: formattedPhone,
        description: `SiletoExpress Order - ${items.length} items - ${amount} ${currency}`,
        callback_url: `${window.location.origin}/payment-success`,
        notification_id: '',
        cartItems,
        deliveryInfo,
        prescriptionId
      };

      const { data: pesapalResponse, error: pesapalError } = await supabase.functions
        .invoke('initiate-pesapal-payment', {
          body: pesapalRequestData,
          headers: { 'Content-Type': 'application/json' }
        });

      if (pesapalError) throw new Error(pesapalError.message || 'Failed to initiate payment');
      if (!pesapalResponse?.success || !pesapalResponse?.redirect_url) {
        throw new Error(pesapalResponse?.error || 'Failed to get payment URL');
      }

      // Store tracking
      localStorage.setItem('pesapal_payment', JSON.stringify({
        trackingId: pesapalResponse.order_tracking_id,
        merchantReference: pesapalResponse.merchant_reference,
        amount,
        currency,
        userId: user.id,
        orderId,
        timestamp: Date.now()
      }));

      clearCart();

      toast({
        title: "Redirecting to Payment",
        description: "You will be redirected to complete your payment..."
      });

      setTimeout(() => {
        window.location.href = pesapalResponse.redirect_url;
      }, 1000);

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Payment failed';
      onError(errMsg);
      toast({ title: "Payment Error", description: errMsg, variant: "destructive" });
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

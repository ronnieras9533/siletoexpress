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
}

// Input validation utilities
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
  paymentType
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { items, clearCart } = useCart();
  const { user } = useAuth();

  const handlePesapalPayment = async () => {
    if (!user) {
      onError('User not authenticated');
      return;
    }

    // Input validation
    if (!validateEmail(customerInfo.email)) {
      onError('Invalid email address format');
      return;
    }

    if (!validateKenyanPhone(customerInfo.phone)) {
      onError('Invalid Kenyan phone number format. Please use format: 0712345678 or +254712345678');
      return;
    }

    if (amount <= 0 || amount > 1000000) {
      onError('Invalid payment amount. Amount must be between 1 and 1,000,000');
      return;
    }

    if (currency !== 'KES') {
      onError('Only Kenyan Shillings (KES) supported for Pesapal payments');
      return;
    }

    setLoading(true);

    try {
      const formattedPhone = formatKenyanPhone(customerInfo.phone);
      const uniqueOrderId = `ORDER_${user.id.substring(0, 8)}_${Date.now()}`;

      console.log('Initiating Pesapal payment:', {
        orderId: uniqueOrderId,
        amount,
        currency,
        paymentType,
        itemCount: items.length
      });

      const cartItems = items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        total: item.price * item.quantity
      }));

      const pesapalRequestData = {
        amount: Math.floor(amount * 100) / 100,
        currency,
        customerInfo: {
          email: customerInfo.email.toLowerCase(),
          phone: formattedPhone,
          name: customerInfo.name
        },
        formData: {
          phone: formatKenyanPhone(formData.phone),
          address: formData.address,
          city: formData.city,
          county: formData.county,
          notes: formData.notes
        },
        prescriptionId,
        paymentType,
        orderId: uniqueOrderId,
        description: `SiletoExpress Order - ${items.length} items - ${amount} ${currency}`,
        callback_url: `${window.location.origin}/pesapal-callback`, // Match with PesapalCallback route
        notification_id: `NOTIF-${Date.now()}`
      };

      console.log('Sending payment request to Pesapal with payload:', pesapalRequestData);

      const { data: pesapalResponse, error: pesapalError } = await supabase.functions
        .invoke('initiate-pesapal-payment', {
          body: JSON.stringify(pesapalRequestData),
          headers: { 'Content-Type': 'application/json' }
        });

      console.log('Pesapal response:', pesapalResponse);

      if (pesapalError) {
        console.error('Pesapal function error:', pesapalError);
        throw new Error(pesapalError.message || 'Failed to initiate payment');
      }

      if (!pesapalResponse?.success || !pesapalResponse?.redirect_url) {
        console.error('Invalid Pesapal response:', pesapalResponse);
        throw new Error(pesapalResponse?.error || 'Failed to get payment URL');
      }

      console.log('Pesapal payment initiated successfully:', pesapalResponse);

      const trackingData = {
        trackingId: pesapalResponse.order_tracking_id,
        merchantReference: pesapalResponse.merchant_reference,
        amount,
        currency,
        userId: user.id,
        orderId: uniqueOrderId,
        timestamp: Date.now()
      };

      localStorage.setItem('pesapal_payment', JSON.stringify(trackingData));
      clearCart();

      toast({
        title: "Redirecting to Payment",
        description: "You will be redirected to complete your payment...",
      });

      setTimeout(() => {
        window.location.href = pesapalResponse.redirect_url;
      }, 1000);

    } catch (error) {
      console.error('Pesapal payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      onError(errorMessage);
      toast({
        title: "Payment Error",
        description: errorMessage,
        variant: "destructive"
      });
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

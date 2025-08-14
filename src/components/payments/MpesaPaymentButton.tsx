import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

interface MpesaPaymentButtonProps {
  amount: number;
  currency: string;
  customerInfo: { email: string; phone: string; name: string };
  formData: { phone: string; address: string; city: string; county: string; notes: string };
  prescriptionId?: string | null;
  beforePay?: () => Promise<{ id: string }>;
  onSuccess: (transactionData: any) => void;
  onError: (error: string) => void;
}

const validateKenyanPhone = (phone: string): boolean =>
  /^(\+254|254|0)?[17]\d{8}$/.test(phone.replace(/\s/g, ''));

const formatKenyanPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('254')) return cleaned;
  if (cleaned.startsWith('0')) return '254' + cleaned.substring(1);
  if (cleaned.length === 9) return '254' + cleaned;
  return cleaned;
};

const MpesaPaymentButton: React.FC<MpesaPaymentButtonProps> = ({
  amount,
  currency,
  customerInfo,
  formData,
  prescriptionId,
  beforePay,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { items, clearCart } = useCart();
  const { user } = useAuth();

  const handleMpesaPayment = async () => {
    if (!user) return onError('User not authenticated');
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

      const mpesaRequestData = {
        orderId,
        amount: Math.floor(amount * 100) / 100,
        currency,
        phone: formattedPhone,
        email: customerInfo.email.toLowerCase(),
        description: `SiletoExpress M-PESA Order - ${items.length} items - ${amount} ${currency}`,
        cartItems,
        deliveryInfo,
        prescriptionId,
      };

      const { data: mpesaResponse, error: mpesaError } = await supabase.functions
        .invoke('mpesa-stk-push', {
          body: mpesaRequestData,
          headers: { 'Content-Type': 'application/json' },
        });

      if (mpesaError || !mpesaResponse?.success) {
        throw new Error(mpesaResponse?.message || mpesaError?.message || 'Failed to initiate M-PESA payment');
      }

      // Save payment tracking info
      localStorage.setItem('mpesa_payment', JSON.stringify({
        checkoutRequestId: mpesaResponse.data.checkout_request_id,
        merchantRequestId: mpesaResponse.data.merchant_request_id,
        amount,
        currency,
        userId: user.id,
        orderId,
        timestamp: Date.now(),
      }));

      clearCart();
      toast({ title: "M-PESA Payment Sent", description: "Please check your phone and enter your M-PESA PIN" });

      onSuccess(mpesaResponse.data);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      onError(message);
      toast({ title: "Payment Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleMpesaPayment}
      disabled={loading}
      className="w-full bg-green-600 hover:bg-green-700 text-white"
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Smartphone className="mr-2 h-4 w-4" />
          Pay with M-PESA - {currency} {amount.toLocaleString()}
        </>
      )}
    </Button>
  );
};

export default MpesaPaymentButton;

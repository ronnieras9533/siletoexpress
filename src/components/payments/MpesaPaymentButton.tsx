import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MpesaPaymentData {
  amount: number;
  phoneNumber: string;
  orderId: string;
  accountReference: string;
  transactionDesc: string;
}

interface MpesaPaymentButtonProps {
  paymentData: MpesaPaymentData;
  beforePay?: () => Promise<{ orderId: string }>;
  onSuccess: (receiptNumber?: string) => void;
  onError: (error: string) => void;
}

const MpesaPaymentButton: React.FC<MpesaPaymentButtonProps> = ({
  paymentData,
  beforePay,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    try {
      setLoading(true);

      // Run beforePay to get the real orderId
      let finalOrderId = paymentData.orderId;
      if (beforePay) {
        const orderInfo = await beforePay();
        if (!orderInfo?.orderId) throw new Error('Order creation failed.');
        finalOrderId = orderInfo.orderId;
      }

      const mpesaPayload = {
        ...paymentData,
        orderId: finalOrderId, // now using the real Supabase order ID
      };

      const { data, error } = await supabase.functions.invoke('initiate-mpesa-payment', {
        body: mpesaPayload,
      });

      if (error || !data?.success) {
        throw new Error(data?.message || error?.message || 'Payment initiation failed');
      }

      toast({
        title: 'Payment Initiated',
        description: 'Check your phone to complete the payment',
      });

      // Optionally poll transaction status here...

      onSuccess(data.receiptNumber || undefined);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      onError(errorMessage);
      toast({
        title: 'Payment Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayment}
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
          Pay with M-PESA - KES {paymentData.amount.toLocaleString()}
        </>
      )}
    </Button>
  );
};

export default MpesaPaymentButton;


import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, Loader2 } from 'lucide-react';
import { mpesaService } from '@/services/mpesaService';
import { useToast } from '@/hooks/use-toast';

interface MpesaPaymentButtonProps {
  paymentData: {
    amount: number;
    phoneNumber: string;
    orderId: string;
    accountReference?: string;
    transactionDesc?: string;
  };
  onSuccess: (txnData: any) => void;
  onError: (error: string) => void;
}

const MpesaPaymentButton: React.FC<MpesaPaymentButtonProps> = ({
  paymentData,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePayment = async () => {
    if (!paymentData.phoneNumber || !paymentData.amount || !paymentData.orderId) {
      onError('Missing required payment information');
      return;
    }

    setLoading(true);
    
    try {
      const response = await mpesaService.initiateSTKPush(paymentData);
      
      if (response.success) {
        toast({
          title: "STK Push Sent",
          description: "Check your phone to complete the payment",
        });
        onSuccess(response);
      } else {
        onError(response.error || 'Payment failed');
      }
    } catch (error) {
      console.error('M-PESA payment error:', error);
      onError(error instanceof Error ? error.message : 'Payment failed');
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
          Sending STK Push...
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

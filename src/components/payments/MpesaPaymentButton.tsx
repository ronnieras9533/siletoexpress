import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client'; // Direct Supabase client as fallback
import { useCart } from '@/contexts/CartContext';

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
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const handlePayment = async () => {
    if (!paymentData.phoneNumber || !paymentData.amount || !paymentData.orderId) {
      onError('Missing required payment information');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Initiate STK Push via Supabase Edge Function (fallback if mpesaService fails)
      console.log('Initiating M-PESA STK Push with payload:', paymentData);
      const { data, error: initError } = await supabase.functions.invoke('mpesa-stk-push', {
        body: JSON.stringify(paymentData),
        headers: { 'Content-Type': 'application/json' }
      });

      if (initError || !data?.success || !data?.checkoutRequestID) {
        throw new Error(data?.error || initError?.message || 'Failed to initiate M-PESA STK Push');
      }

      const checkoutRequestID = data.checkoutRequestID;
      setLoading(false);
      setVerifying(true);

      toast({
        title: "STK Push Sent",
        description: "Please check your phone and enter your M-PESA PIN to complete payment.",
      });

      // Step 2: Wait for payment confirmation (polling or callback-based)
      try {
        const pollInterval = 2000; // 2 seconds
        const maxAttempts = 60; // 2 minutes timeout
        let attempts = 0;

        const checkPaymentStatus = async (): Promise<any> => {
          attempts++;
          const { data: payment, error } = await supabase
            .from('payments')
            .select('*')
            .eq('transaction_id', checkoutRequestID)
            .single();

          if (error) {
            console.error('Payment status check error:', error);
            return { success: false, error: 'Failed to check payment status' };
          }

          if (payment?.status === 'completed') {
            return { success: true, payment };
          } else if (payment?.status === 'failed' || attempts >= maxAttempts) {
            return { success: false, error: payment?.status === 'failed' ? 'Payment failed' : 'Payment verification timeout' };
          }
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          return checkPaymentStatus();
        };

        const confirmationResult = await checkPaymentStatus();

        if (confirmationResult.success) {
          toast({
            title: "Payment Successful!",
            description: `Payment of KES ${paymentData.amount.toLocaleString()} completed successfully.`,
          });
          clearCart();
          navigate(`/mpesa-callback?checkout_request_id=${checkoutRequestID}&payment_id=${confirmationResult.payment?.id}`);
          onSuccess(confirmationResult);
        } else {
          toast({
            title: confirmationResult.error.includes('timeout') ? "Payment Verification Timeout" : "Payment Failed",
            description: confirmationResult.error.includes('timeout')
              ? "Please check your M-PESA messages or contact support if payment was deducted."
              : "Your M-PESA payment was not successful.",
            variant: "destructive"
          });
          onError(confirmationResult.error);
        }
      } catch (confirmationError) {
        console.error('Payment confirmation error:', confirmationError);
        toast({
          title: "Payment Verification Error",
          description: "Unable to verify payment status. Please contact support if payment was deducted.",
          variant: "destructive"
        });
        onError('Payment verification failed');
      }
    } catch (error) {
      console.error('M-PESA payment error:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : 'Payment failed',
        variant: "destructive"
      });
      onError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  const getButtonContent = () => {
    if (loading) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Initiating Payment...
        </>
      );
    }
    if (verifying) {
      return (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Verifying Payment...
        </>
      );
    }
    return (
      <>
        <Smartphone className="mr-2 h-4 w-4" />
        Pay with M-PESA - KES {paymentData.amount.toLocaleString()}
      </>
    );
  };

  return (
    <Button
      onClick={handlePayment}
      disabled={loading || verifying}
      className="w-full bg-green-600 hover:bg-green-700 text-white"
      size="lg"
    >
      {getButtonContent()}
    </Button>
  );
};

export default MpesaPaymentButton;

import React, { useState, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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

const MpesaPaymentButton = forwardRef<HTMLButtonElement, MpesaPaymentButtonProps>(
  ({ paymentData, onSuccess, onError }, ref) => {
    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const { toast } = useToast();
    const navigate = useNavigate();
    const { clearCart } = useCart();

    const handlePayment = async () => {
      try {
        console.log('MpesaPaymentButton rendered with:', paymentData);
        console.log('Starting M-Pesa payment process at:', new Date().toISOString());
        console.log('Supabase client initialized:', supabase);

        if (!paymentData.phoneNumber || !paymentData.amount || !paymentData.orderId) {
          throw new Error('Missing required payment information: phoneNumber, amount, or orderId');
        }

        setLoading(true);

        console.log('Invoking mpesa-stk-push with payload:', JSON.stringify(paymentData));
        const response = await supabase.functions.invoke('mpesa-stk-push', {
          body: JSON.stringify(paymentData),
          headers: { 'Content-Type': 'application/json' }
        });

        console.log('Invoke response:', {
          status: response.status || 'N/A',
          data: response.data,
          error: response.error
        });

        if (response.error || !response.data?.success || !response.data?.checkoutRequestID) {
          throw new Error(response.data?.error || response.error?.message || 'Failed to initiate M-Pesa STK Push');
        }

        const checkoutRequestID = response.data.checkoutRequestID;
        setLoading(false);
        setVerifying(true);

        toast({
          title: "STK Push Sent",
          description: "Please check your phone and enter your M-PESA PIN to complete payment.",
        });

        try {
          const pollInterval = 2000;
          const maxAttempts = 60;
          let attempts = 0;

          const checkPaymentStatus = async (): Promise<any> => {
            attempts++;
            console.log(`Polling payment status, attempt ${attempts}, CheckoutRequestID: ${checkoutRequestID}`);
            const { data: payment, error: statusError } = await supabase
              .from('payments')
              .select('*')
              .eq('transaction_id', checkoutRequestID)
              .single();

            if (statusError) {
              console.error('Payment status check error:', statusError);
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
        console.error('M-Pesa payment error:', error);
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
        ref={ref}
        onClick={handlePayment}
        disabled={loading || verifying || !paymentData.orderId}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        size="lg"
      >
        {getButtonContent()}
      </Button>
    );
  }
);

export default MpesaPaymentButton;


import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { mpesaService } from '@/services/mpesaService';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

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

  const handlePayment = async () => {
    if (!paymentData.phoneNumber || !paymentData.amount || !paymentData.orderId) {
      onError('Missing required payment information');
      return;
    }

    setLoading(true);
    
    try {
      // Step 1: Initiate STK Push
      const response = await mpesaService.initiateSTKPush(paymentData);
      
      if (response.success && response.checkoutRequestID) {
        setLoading(false);
        setVerifying(true);

        toast({
          title: "STK Push Sent",
          description: "Please check your phone and enter your M-PESA PIN to complete payment.",
        });

        // Step 2: Wait for payment confirmation
        try {
          const confirmationResult = await mpesaService.waitForPaymentConfirmation(
            response.checkoutRequestID, 
            120000 // 2 minutes timeout
          );

          if (confirmationResult.success) {
            toast({
              title: "Payment Successful!",
              description: `Payment of KES ${paymentData.amount.toLocaleString()} completed successfully.`,
            });
            
            // Navigate to success page with payment details
            navigate(`/mpesa-callback?checkout_request_id=${response.checkoutRequestID}&payment_id=${confirmationResult.payment?.id}`);
            onSuccess(confirmationResult);
          } else if (confirmationResult.timeout) {
            toast({
              title: "Payment Verification Timeout",
              description: "Please check your M-PESA messages or contact support if payment was deducted.",
              variant: "destructive"
            });
            onError(confirmationResult.error || 'Payment verification timeout');
          } else {
            toast({
              title: "Payment Failed",
              description: confirmationResult.error || "Your M-PESA payment was not successful.",
              variant: "destructive"
            });
            onError(confirmationResult.error || 'Payment failed');
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
      } else {
        toast({
          title: "Payment Failed",
          description: response.error || "Failed to initiate M-PESA payment.",
          variant: "destructive"
        });
        onError(response.error || 'Payment failed');
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

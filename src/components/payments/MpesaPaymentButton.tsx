import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Smartphone, Loader2 } from 'lucide-react';
import { mpesaService } from '@/services/mpesaService';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface MpesaPaymentButtonProps {
  paymentData: {
    amount: number;
    phoneNumber: string;
    orderId?: string;
    accountReference?: string;
    transactionDesc?: string;
  };
  onSuccess: (txnData: any) => void;
  onError: (error: string) => void;
  beforePay?: () => Promise<{ orderId: string } | any>; // optional hook
}

const MpesaPaymentButton: React.FC<MpesaPaymentButtonProps> = ({
  paymentData,
  onSuccess,
  onError,
  beforePay
}) => {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handlePayment = async () => {
    try {
      setLoading(true);

      // 1️⃣ Create order first if beforePay exists
      let finalPaymentData = { ...paymentData };
      let createdOrderId = '';
      
      if (beforePay) {
        const orderInfo = await beforePay();
        if (!orderInfo?.orderId) {
          throw new Error('Order creation failed.');
        }
        finalPaymentData.orderId = orderInfo.orderId;
        createdOrderId = orderInfo.orderId;
      }

      if (!finalPaymentData.phoneNumber || !finalPaymentData.amount || !finalPaymentData.orderId) {
        onError('Missing required payment information');
        setLoading(false);
        return;
      }

      // 2️⃣ Initiate STK Push
      const response = await mpesaService.initiateSTKPush(finalPaymentData);

      if (response.success && response.checkoutRequestID) {
        setLoading(false);
        setVerifying(true);

        toast({
          title: "STK Push Sent",
          description: "Please check your phone and enter your M-PESA PIN to complete payment.",
        });

        // 3️⃣ Wait for payment confirmation
        const confirmationResult = await mpesaService.waitForPaymentConfirmation(
          response.checkoutRequestID,
          120000 // 2 minutes timeout
        );

        setVerifying(false);

        if (confirmationResult.success) {
          toast({
            title: "Payment Successful!",
            description: `Payment of KES ${finalPaymentData.amount.toLocaleString()} completed successfully.`,
          });
          
          // Pass the orderId to the success callback
          onSuccess({
            ...confirmationResult,
            orderId: createdOrderId || finalPaymentData.orderId
          });
          
          navigate(`/mpesa-callback?checkout_request_id=${response.checkoutRequestID}&payment_id=${confirmationResult.payment?.id}`);
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
      } else {
        setLoading(false);
        toast({
          title: "Payment Failed",
          description: response.error || "Failed to initiate M-PESA payment.",
          variant: "destructive"
        });
        onError(response.error || 'Payment failed');
      }
    } catch (error) {
      setLoading(false);
      setVerifying(false);
      console.error('M-PESA payment error:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : 'Payment failed',
        variant: "destructive"
      });
      onError(error instanceof Error ? error.message : 'Payment failed');
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

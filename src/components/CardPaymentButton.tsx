
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { flutterwaveService } from '@/services/flutterwaveService';
import { useToast } from '@/components/ui/use-toast';

interface CardPaymentButtonProps {
  amount: number;
  currency: string;
  orderId: string;
  customerInfo: {
    email: string;
    phone: string;
    name: string;
  };
  onSuccess: (transactionData: any) => void;
  onError: (error: string) => void;
}

const CardPaymentButton: React.FC<CardPaymentButtonProps> = ({
  amount,
  currency,
  orderId,
  customerInfo,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCardPayment = async () => {
    setLoading(true);
    
    try {
      const txRef = flutterwaveService.generateTransactionRef();
      const redirectUrl = `${window.location.origin}/payment-success?tx_ref=${txRef}&order_id=${orderId}`;

      const paymentData = {
        amount,
        currency,
        email: customerInfo.email,
        phone_number: customerInfo.phone,
        name: customerInfo.name,
        tx_ref: txRef,
        redirect_url: redirectUrl,
        customer: {
          email: customerInfo.email,
          phone_number: customerInfo.phone,
          name: customerInfo.name
        },
        customizations: {
          title: "SiletoExpress Payment",
          description: "Secure payment for your pharmacy order",
          logo: ""
        }
      };

      const response = await flutterwaveService.initiatePayment({
        ...paymentData,
        order_id: orderId
      });

      if (response.status === 'success' && response.data?.link) {
        // Redirect to Flutterwave payment page
        window.location.href = response.data.link;
      } else {
        throw new Error(response.message || 'Payment initiation failed');
      }
    } catch (error) {
      console.error('Card payment error:', error);
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

  return (
    <Button
      onClick={handleCardPayment}
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
          <CreditCard className="mr-2 h-4 w-4" />
          Pay with Card - {currency} {amount.toLocaleString()}
        </>
      )}
    </Button>
  );
};

export default CardPaymentButton;


import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BrevoPaymentButtonProps {
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
  onSuccess: (transactionData: any) => void;
  onError: (error: string) => void;
}

const BrevoPaymentButton: React.FC<BrevoPaymentButtonProps> = ({
  amount,
  currency,
  customerInfo,
  formData,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleBrevoPayment = async () => {
    setLoading(true);
    
    try {
      // For now, simulate card payment processing
      // In production, this would integrate with actual Brevo payment gateway
      
      const orderId = `ORDER_${Date.now()}`;
      
      // Store payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          order_id: orderId,
          amount: amount,
          currency: currency,
          method: 'card',
          gateway: 'brevo',
          status: 'completed',
          transaction_id: `BREVO_${Date.now()}`,
          metadata: {
            customerInfo,
            formData,
            timestamp: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (paymentError) {
        throw new Error('Failed to record payment');
      }

      toast({
        title: "Payment Successful!",
        description: "Your card payment has been processed successfully.",
      });

      onSuccess({
        transactionId: payment.transaction_id,
        amount,
        currency,
        method: 'card',
        orderId
      });

    } catch (error) {
      console.error('Brevo payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Card payment failed';
      onError(errorMessage);
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleBrevoPayment}
      disabled={loading}
      className="w-full bg-green-600 hover:bg-green-700 text-white"
      size="lg"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Processing Card Payment...
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

export default BrevoPaymentButton;

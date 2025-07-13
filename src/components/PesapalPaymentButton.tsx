import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, Smartphone } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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
    notes: string;
  };
  prescriptionId?: string | null;
  onSuccess: (transactionData: any) => void;
  onError: (error: string) => void;
  paymentType: 'card' | 'mobile';
}

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
  const navigate = useNavigate();


  const handlePesapalPayment = async () => {
    if (!user) {
      onError('User not authenticated');
      return;
    }

    setLoading(true);
    
    try {
      // Prepare payment data for Pesapal (no order creation yet)
      const paymentData = {
        amount,
        currency,
        userId: user.id,
        customerInfo: {
          email: customerInfo.email,
          phone: customerInfo.phone.replace(/^\+?254/, '254'), // Ensure proper format
          name: customerInfo.name
        },
        formData,
        prescriptionId,
        cartItems: items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price
        }))
      };

      console.log('Initiating Pesapal payment:', paymentData);

      // Call Pesapal edge function
      const { data: pesapalResponse, error: pesapalError } = await supabase.functions
        .invoke('pesapal-payment', {
          body: paymentData
        });

      if (pesapalError) {
        console.error('Pesapal function error:', pesapalError);
        throw new Error(pesapalError.message || 'Failed to initiate payment');
      }

      if (!pesapalResponse?.success || !pesapalResponse?.redirect_url) {
        console.error('Invalid Pesapal response:', pesapalResponse);
        throw new Error(pesapalResponse?.error || 'Failed to get payment URL');
      }

      console.log('Pesapal payment initiated successfully:', pesapalResponse);

      // Store payment tracking info in localStorage for later retrieval
      localStorage.setItem('pesapal_payment', JSON.stringify({
        trackingId: pesapalResponse.order_tracking_id,
        merchantReference: pesapalResponse.merchant_reference,
        amount: amount,
        currency: currency
      }));

      // Clear cart since payment intent is created
      clearCart();

      // Redirect to Pesapal payment page
      window.location.href = pesapalResponse.redirect_url;

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
    : `Pay with Mobile Money - ${currency} ${amount.toLocaleString()}`;

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
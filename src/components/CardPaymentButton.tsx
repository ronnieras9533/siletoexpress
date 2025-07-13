
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { flutterwaveService } from '@/services/flutterwaveService';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

interface CardPaymentButtonProps {
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
}

const CardPaymentButton: React.FC<CardPaymentButtonProps> = ({
  amount,
  currency,
  customerInfo,
  formData,
  prescriptionId,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { items, clearCart } = useCart();
  const { user } = useAuth();

  const createOrder = async () => {
    if (!user) throw new Error('User not authenticated');

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        total_amount: amount,
        phone_number: formData.phone,
        delivery_address: `${formData.address}, ${formData.city}`,
        status: 'pending',
        payment_method: 'card',
        currency: currency
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Link prescription if exists
    if (prescriptionId) {
      await supabase
        .from('prescriptions')
        .update({ order_id: order.id })
        .eq('id', prescriptionId);
    }

    return order;
  };

  const handleCardPayment = async () => {
    setLoading(true);
    
    try {
      // Create order first
      const order = await createOrder();
      
      const txRef = flutterwaveService.generateTransactionRef();
      const redirectUrl = `${window.location.origin}/payment-success?tx_ref=${txRef}&order_id=${order.id}`;

      const paymentData = {
        amount,
        currency,
        email: customerInfo.email,
        phone_number: customerInfo.phone,
        name: customerInfo.name,
        tx_ref: txRef,
        redirect_url: redirectUrl,
        order_id: order.id,
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

      const response = await flutterwaveService.initiatePayment(paymentData);

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

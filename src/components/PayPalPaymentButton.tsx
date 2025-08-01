
import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

interface PayPalPaymentButtonProps {
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

declare global {
  interface Window {
    paypal: any;
  }
}

const PayPalPaymentButton: React.FC<PayPalPaymentButtonProps> = ({
  amount,
  currency,
  customerInfo,
  formData,
  prescriptionId,
  onSuccess,
  onError
}) => {
  const paypalRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const { toast } = useToast();
  const { items, clearCart } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    // Load PayPal SDK
    const loadPayPalScript = () => {
      if (window.paypal) {
        setSdkLoaded(true);
        setLoading(false);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${getPayPalClientId()}&currency=${currency}&components=buttons,funding-eligibility`;
      script.async = true;
      script.onload = () => {
        setSdkLoaded(true);
        setLoading(false);
      };
      script.onerror = () => {
        setLoading(false);
        onError('Failed to load PayPal SDK');
      };
      document.head.appendChild(script);
    };

    loadPayPalScript();
  }, [currency, onError]);

  useEffect(() => {
    if (sdkLoaded && paypalRef.current && window.paypal && !loading) {
      renderPayPalButtons();
    }
  }, [sdkLoaded, loading, amount, currency]);

  const getPayPalClientId = () => {
    // In production, store this in environment variables
    return 'AYFdaWEFBEJQD6FNRUNaMZq0QX5WDm9h3xo1kD4lhyOhSJVP5eO-Y5u2V3m8vIFO8FgLhyOhSJVP5eO-Y5u2';
  };

  const renderPayPalButtons = () => {
    if (!paypalRef.current) return;

    // Clear any existing buttons
    paypalRef.current.innerHTML = '';

    window.paypal.Buttons({
      style: {
        layout: 'horizontal',
        color: 'blue',
        shape: 'rect',
        label: 'paypal',
        height: 40
      },
      createOrder: async (data: any, actions: any) => {
        console.log('Creating PayPal order...');
        
        try {
          // Create order in our database first
          const orderData = await createOrderInDatabase();
          
          return actions.order.create({
            purchase_units: [{
              reference_id: orderData.order_id,
              amount: {
                currency_code: currency,
                value: amount.toFixed(2)
              },
              description: `SiletoExpress Order #${orderData.order_id}`,
              custom_id: orderData.order_id
            }],
            application_context: {
              shipping_preference: 'NO_SHIPPING'
            }
          });
        } catch (error) {
          console.error('Error creating order:', error);
          onError('Failed to create order');
          throw error;
        }
      },
      onApprove: async (data: any, actions: any) => {
        console.log('PayPal payment approved:', data);
        setLoading(true);

        try {
          const order = await actions.order.capture();
          console.log('PayPal order captured:', order);

          // Update our database with payment confirmation
          await updateOrderWithPayment(order);

          toast({
            title: "Payment Successful!",
            description: "Your order has been confirmed.",
          });

          clearCart();
          onSuccess({
            paypal_order_id: order.id,
            transaction_id: order.purchase_units[0].payments.captures[0].id,
            amount: amount,
            currency: currency,
            status: 'completed'
          });

        } catch (error) {
          console.error('Error capturing payment:', error);
          onError('Payment capture failed');
          toast({
            title: "Payment Error",
            description: "Failed to process payment. Please try again.",
            variant: "destructive"
          });
        } finally {
          setLoading(false);
        }
      },
      onError: (err: any) => {
        console.error('PayPal error:', err);
        onError('PayPal payment failed');
        toast({
          title: "Payment Error",
          description: "PayPal payment failed. Please try again.",
          variant: "destructive"
        });
      },
      onCancel: (data: any) => {
        console.log('PayPal payment cancelled:', data);
        toast({
          title: "Payment Cancelled",
          description: "Payment was cancelled by user.",
          variant: "destructive"
        });
      }
    }).render(paypalRef.current);
  };

  const createOrderInDatabase = async () => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        email: customerInfo.email,
        phone_number: customerInfo.phone,
        delivery_address: `${formData.address}, ${formData.city}`,
        total_amount: amount,
        currency: currency,
        status: 'pending',
        payment_method: 'paypal',
        requires_prescription: prescriptionId ? true : false,
        prescription_approved: prescriptionId ? false : true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating order:', error);
      throw error;
    }

    // Create order items
    if (items.length > 0) {
      const orderItems = items.map(item => ({
        order_id: data.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
        throw itemsError;
      }
    }

    return { order_id: data.id };
  };

  const updateOrderWithPayment = async (paypalOrder: any) => {
    const transactionId = paypalOrder.purchase_units[0].payments.captures[0].id;
    const orderId = paypalOrder.purchase_units[0].reference_id;

    // Update order status
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        payment_initiated: true
      })
      .eq('id', orderId);

    if (orderError) {
      console.error('Error updating order:', orderError);
      throw orderError;
    }

    // Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user?.id,
        order_id: orderId,
        amount: amount,
        currency: currency,
        method: 'paypal',
        status: 'completed',
        transaction_id: transactionId,
        metadata: {
          paypal_order_id: paypalOrder.id,
          payer_email: paypalOrder.payer.email_address
        }
      });

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      throw paymentError;
    }
  };

  if (loading) {
    return (
      <Button disabled className="w-full bg-blue-600">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading PayPal...
      </Button>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="text-center text-sm text-gray-600 mb-2">
        Pay securely with PayPal or your credit/debit card
      </div>
      <div ref={paypalRef} className="w-full" />
      <div className="text-xs text-gray-500 text-center">
        Amount: {currency} {amount.toLocaleString()}
      </div>
    </div>
  );
};

export default PayPalPaymentButton;

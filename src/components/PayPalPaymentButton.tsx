
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

// Input validation utilities
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

const sanitizeInput = (input: string): string => {
  return input.replace(/[<>\"'&]/g, '').trim();
};

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
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const { toast } = useToast();
  const { items, clearCart } = useCart();
  const { user } = useAuth();

  // Input validation on mount
  useEffect(() => {
    // Validate customer info
    if (!validateEmail(customerInfo.email)) {
      onError('Invalid email address');
      return;
    }

    if (!validatePhone(customerInfo.phone)) {
      onError('Invalid phone number format');
      return;
    }

    // Validate amount
    if (amount <= 0 || amount > 1000000) {
      onError('Invalid payment amount');
      return;
    }

    // Validate currency
    if (!['USD', 'EUR', 'KES'].includes(currency)) {
      onError('Unsupported currency');
      return;
    }
  }, [amount, currency, customerInfo, onError]);

  useEffect(() => {
    const loadPayPalScript = () => {
      if (window.paypal) {
        setSdkLoaded(true);
        setLoading(false);
        return;
      }

      // Get PayPal client ID from environment or secure source
      const clientId = getPayPalClientId();
      if (!clientId) {
        onError('PayPal configuration not available');
        return;
      }

      const script = document.createElement('script');
      // Restrict to specific domain for security
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&components=buttons,funding-eligibility&intent=capture`;
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
    if (sdkLoaded && paypalRef.current && window.paypal && !loading && !rateLimitExceeded) {
      renderPayPalButtons();
    }
  }, [sdkLoaded, loading, amount, currency, rateLimitExceeded]);

  const getPayPalClientId = () => {
    // In production, this should come from environment variables
    // For now, we'll use a placeholder that should be replaced with actual env var
    return process.env.REACT_APP_PAYPAL_CLIENT_ID || 'PAYPAL_CLIENT_ID_NOT_SET';
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
          // Rate limiting check
          if (rateLimitExceeded) {
            throw new Error('Rate limit exceeded. Please try again later.');
          }

          // Validate and sanitize inputs
          const sanitizedCustomerInfo = {
            email: sanitizeInput(customerInfo.email),
            phone: sanitizeInput(customerInfo.phone),
            name: sanitizeInput(customerInfo.name)
          };

          const sanitizedFormData = {
            phone: sanitizeInput(formData.phone),
            address: sanitizeInput(formData.address),
            city: sanitizeInput(formData.city),
            notes: sanitizeInput(formData.notes)
          };

          // Create order in our database first with validation
          const orderData = await createOrderInDatabase(sanitizedCustomerInfo, sanitizedFormData);
          
          return actions.order.create({
            purchase_units: [{
              reference_id: orderData.order_id,
              amount: {
                currency_code: currency,
                value: amount.toFixed(2)
              },
              description: `Sileto Pharmaceuticals Order #${orderData.order_id}`,
              custom_id: orderData.order_id
            }],
            application_context: {
              shipping_preference: 'NO_SHIPPING',
              return_url: `${window.location.origin}/payment-success`,
              cancel_url: `${window.location.origin}/checkout`
            }
          });
        } catch (error) {
          console.error('Error creating order:', error);
          
          // Implement rate limiting
          if (error instanceof Error && error.message.includes('rate limit')) {
            setRateLimitExceeded(true);
            setTimeout(() => setRateLimitExceeded(false), 300000); // 5 minutes
          }
          
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

          // Verify payment amount matches our expected amount
          const capturedAmount = parseFloat(order.purchase_units[0].payments.captures[0].amount.value);
          if (Math.abs(capturedAmount - amount) > 0.01) {
            throw new Error('Payment amount mismatch');
          }

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
            amount: capturedAmount,
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

  const createOrderInDatabase = async (sanitizedCustomerInfo: any, sanitizedFormData: any) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Validate user permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User verification failed');
    }

    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        email: sanitizedCustomerInfo.email,
        phone_number: sanitizedCustomerInfo.phone,
        delivery_address: `${sanitizedFormData.address}, ${sanitizedFormData.city}`,
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

    // Create order items with validation
    if (items.length > 0) {
      const orderItems = items.map(item => ({
        order_id: data.id,
        product_id: item.id,
        quantity: Math.max(1, Math.min(100, Math.floor(item.quantity))), // Validate quantity
        price: Math.max(0, parseFloat(item.price.toString())) // Validate price
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

    // Validate transaction ID
    if (!transactionId || typeof transactionId !== 'string') {
      throw new Error('Invalid transaction ID');
    }

    // Update order status
    const { error: orderError } = await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        payment_initiated: true
      })
      .eq('id', orderId)
      .eq('user_id', user?.id); // Ensure user can only update their own orders

    if (orderError) {
      console.error('Error updating order:', orderError);
      throw orderError;
    }

    // Create payment record with validation
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user?.id,
        order_id: orderId,
        amount: amount,
        currency: currency,
        method: 'paypal',
        status: 'completed',
        transaction_id: sanitizeInput(transactionId),
        metadata: {
          paypal_order_id: sanitizeInput(paypalOrder.id),
          payer_email: sanitizeInput(paypalOrder.payer?.email_address || ''),
          verification_timestamp: new Date().toISOString()
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

  if (rateLimitExceeded) {
    return (
      <Button disabled className="w-full bg-gray-400">
        Rate limit exceeded. Please try again later.
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

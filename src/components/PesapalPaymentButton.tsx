
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

// Input validation utilities
const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

const validateKenyanPhone = (phone: string): boolean => {
  const kenyanPhoneRegex = /^(\+254|254|0)?[17]\d{8}$/;
  return kenyanPhoneRegex.test(phone.replace(/\s/g, ''));
};

const sanitizeInput = (input: string): string => {
  return input.replace(/[<>\"'&]/g, '').trim();
};

const formatKenyanPhone = (phone: string): string => {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('254')) {
    return cleaned;
  } else if (cleaned.startsWith('0')) {
    return '254' + cleaned.substring(1);
  } else if (cleaned.length === 9) {
    return '254' + cleaned;
  }
  
  return cleaned;
};

// Rate limiting helper
const isRateLimited = (key: string, maxAttempts: number = 3, windowMs: number = 15 * 60 * 1000): boolean => {
  const now = Date.now();
  const attempts = JSON.parse(localStorage.getItem(`rate_limit_${key}`) || '[]');
  
  // Clean old attempts
  const validAttempts = attempts.filter((timestamp: number) => now - timestamp < windowMs);
  
  if (validAttempts.length >= maxAttempts) {
    return true;
  }
  
  // Add current attempt
  validAttempts.push(now);
  localStorage.setItem(`rate_limit_${key}`, JSON.stringify(validAttempts));
  
  return false;
};

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
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const { toast } = useToast();
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handlePesapalPayment = async () => {
    if (!user) {
      onError('User not authenticated');
      return;
    }

    // Rate limiting check
    const rateLimitKey = `pesapal_${user.id}`;
    if (isRateLimited(rateLimitKey, 3, 15 * 60 * 1000)) {
      setRateLimitExceeded(true);
      onError('Too many payment attempts. Please try again in 15 minutes.');
      return;
    }

    // Input validation
    if (!validateEmail(customerInfo.email)) {
      onError('Invalid email address format');
      return;
    }

    if (!validateKenyanPhone(customerInfo.phone)) {
      onError('Invalid Kenyan phone number format. Please use format: 0712345678 or +254712345678');
      return;
    }

    // Validate amount
    if (amount <= 0 || amount > 1000000) {
      onError('Invalid payment amount. Amount must be between 1 and 1,000,000');
      return;
    }

    // Validate currency
    if (currency !== 'KES') {
      onError('Only Kenyan Shillings (KES) supported for Pesapal payments');
      return;
    }

    setLoading(true);
    
    try {
      // Verify user permissions
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile) {
        throw new Error('User verification failed');
      }

      // Sanitize inputs
      const sanitizedCustomerInfo = {
        email: sanitizeInput(customerInfo.email.toLowerCase()),
        phone: formatKenyanPhone(sanitizeInput(customerInfo.phone)),
        name: sanitizeInput(customerInfo.name)
      };

      const sanitizedFormData = {
        phone: formatKenyanPhone(sanitizeInput(formData.phone)),
        address: sanitizeInput(formData.address),
        city: sanitizeInput(formData.city),
        notes: sanitizeInput(formData.notes)
      };

      // Prepare payment request data for Pesapal
      const pesapalPaymentRequest = {
        amount: Math.floor(amount * 100) / 100, // Ensure 2 decimal places
        currency,
        userId: user.id,
        customerInfo: sanitizedCustomerInfo,
        formData: sanitizedFormData,
        prescriptionId,
        cartItems: items.map(item => ({
          id: sanitizeInput(item.id),
          quantity: Math.max(1, Math.min(100, Math.floor(item.quantity))),
          price: Math.max(0, parseFloat(item.price.toString()))
        })),
        paymentType
      };

      console.log('Initiating Pesapal payment:', pesapalPaymentRequest);

      // Generate unique order ID with timestamp
      const uniqueOrderId = `ORDER_${user.id.substring(0, 8)}_${Date.now()}`;

      // Call Pesapal edge function with proper payment structure
      const pesapalRequestData = {
        orderId: uniqueOrderId,
        amount: pesapalPaymentRequest.amount,
        currency: currency,
        email: sanitizedCustomerInfo.email,
        phone: sanitizedCustomerInfo.phone,
        description: `SiletoExpress Order - ${pesapalPaymentRequest.amount} ${currency}`,
        callback_url: `${window.location.origin}/pesapal-callback`,
        notification_id: process.env.REACT_APP_PESAPAL_IPN_ID || ''
      };

      const { data: pesapalResponse, error: pesapalError } = await supabase.functions
        .invoke('pesapal-payment', {
          body: pesapalRequestData,
          headers: {
            'Content-Type': 'application/json',
            'X-Client-Origin': window.location.origin
          }
        });

      if (pesapalError) {
        console.error('Pesapal function error:', pesapalError);
        
        // Implement rate limiting on errors
        if (pesapalError.message?.includes('rate limit') || pesapalError.status === 429) {
          setRateLimitExceeded(true);
          setTimeout(() => setRateLimitExceeded(false), 300000); // 5 minutes
          throw new Error('Too many payment requests. Please try again in 5 minutes.');
        }
        
        throw new Error(pesapalError.message || 'Failed to initiate payment');
      }

      if (!pesapalResponse?.success || !pesapalResponse?.redirect_url) {
        console.error('Invalid Pesapal response:', pesapalResponse);
        throw new Error(pesapalResponse?.error || 'Failed to get payment URL');
      }

      console.log('Pesapal payment initiated successfully:', pesapalResponse);

      // Store payment tracking info securely in localStorage with expiration
      const trackingData = {
        trackingId: pesapalResponse.order_tracking_id,
        merchantReference: pesapalResponse.merchant_reference,
        amount: pesapalPaymentRequest.amount,
        currency: currency,
        userId: user.id,
        timestamp: Date.now(),
        expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes expiry
      };

      localStorage.setItem('pesapal_payment', JSON.stringify(trackingData));

      // Clear cart since payment intent is created
      clearCart();

      // Validate redirect URL before redirecting
      const redirectUrl = new URL(pesapalResponse.redirect_url);
      if (!redirectUrl.hostname.includes('pesapal.com')) {
        throw new Error('Invalid payment redirect URL');
      }

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

  if (rateLimitExceeded) {
    return (
      <Button disabled className="w-full bg-gray-400">
        Rate limit exceeded. Please try again later.
      </Button>
    );
  }

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

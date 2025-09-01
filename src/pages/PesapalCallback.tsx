import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';

const PesapalCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'cancelled'>('loading');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const storedPayment = localStorage.getItem('pesapal_payment');
        const paymentInfo = storedPayment ? JSON.parse(storedPayment) : null;

        const orderTrackingId = searchParams.get('OrderTrackingId');
        const merchantReference = searchParams.get('OrderMerchantReference');

        if (orderTrackingId && merchantReference) {
          setStatus('success');

          if (paymentInfo?.orderId) {
            await supabase
              .from('orders')
              .update({ 
                payment_status: 'paid',
                transaction_id: orderTrackingId
              } as any)
              .eq('id', paymentInfo.orderId);
          }

          clearCart();
          localStorage.removeItem('pesapal_payment');

          toast({
            title: "Payment Successful!",
            description: "Your payment has been processed successfully.",
          });

          // ✅ Redirect to "Complete Payment" step
          const finalOrderId = paymentInfo?.orderId || merchantReference;
          navigate(`/payment/complete?orderId=${finalOrderId}`);
        } else {
          const cancelled = searchParams.get('cancelled');
          if (cancelled === 'true') {
            setStatus('cancelled');
            toast({
              title: "Payment Cancelled",
              description: "Your payment was cancelled.",
              variant: "destructive"
            });
          } else {
            setStatus('failed');
            toast({
              title: "Payment Failed",
              description: "Your payment could not be processed.",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        console.error('Callback handling error:', error);
        setStatus('failed');
        toast({
          title: "Error",
          description: "There was an error processing your payment callback.",
          variant: "destructive"
        });
      }
    };

    handleCallback();
  }, [searchParams, navigate, toast, clearCart]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      {status === 'loading' && <p>Processing payment...</p>}
      {status === 'failed' && <p>Payment failed.</p>}
      {status === 'cancelled' && <p>Payment cancelled.</p>}
    </div>
  );
};

export default PesapalCallback;

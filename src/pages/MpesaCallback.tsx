import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const MpesaCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');

  const checkoutRequestID = searchParams.get('checkout_request_id');

  useEffect(() => {
    if (!checkoutRequestID) {
      setStatus('failed');
      return;
    }

    const checkPaymentStatus = async () => {
      try {
        // Poll for payment status every 2 seconds for up to 2 minutes
        const maxAttempts = 60;
        let attempts = 0;

        const pollStatus = async (): Promise<void> => {
          attempts++;
          
          const { data: payment, error } = await supabase
            .from('payments')
            .select('*, orders(id)')
            .eq('transaction_id', checkoutRequestID)
            .single();

          if (error || !payment) {
            if (attempts >= maxAttempts) {
              setStatus('failed');
              toast({
                title: "Payment Status Unknown",
                description: "Unable to verify payment status. Please contact support.",
                variant: "destructive"
              });
            } else {
              setTimeout(pollStatus, 2000);
            }
            return;
          }

          if (payment.status === 'success') {
            setStatus('success');

            toast({
              title: "Payment Successful!",
              description: `Payment of KES ${payment.amount} completed successfully.`,
            });

            // ✅ Redirect to "Complete Payment" step with orderId
            if (payment.order_id) {
              navigate(`/payment/complete?orderId=${payment.order_id}`);
            }
          } else if (payment.status === 'failed') {
            setStatus('failed');
            toast({
              title: "Payment Failed",
              description: "Your M-PESA payment was not successful.",
              variant: "destructive"
            });
          } else if (attempts >= maxAttempts) {
            setStatus('failed');
            toast({
              title: "Payment Timeout",
              description: "Payment verification timed out. Please check your M-PESA messages or contact support.",
              variant: "destructive"
            });
          } else {
            setTimeout(pollStatus, 2000);
          }
        };

        pollStatus();
      } catch (error) {
        console.error('Error checking payment status:', error);
        setStatus('failed');
      }
    };

    checkPaymentStatus();
  }, [checkoutRequestID, navigate, toast]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      {status === 'pending' && <p>Checking payment status...</p>}
      {status === 'failed' && <p>Payment failed or could not be verified.</p>}
    </div>
  );
};

export default MpesaCallback;

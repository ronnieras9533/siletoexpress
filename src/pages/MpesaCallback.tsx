import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const MpesaCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [paymentData, setPaymentData] = useState<any>(null);

  const checkoutRequestID = searchParams.get('checkout_request_id');
  const paymentId = searchParams.get('payment_id');

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
            .select('*, orders(*)')
            .eq('transaction_id', checkoutRequestID)
            .single();

          if (error) {
            console.error('Error checking payment status:', error);
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

          if (payment.status === 'completed') {
            setStatus('success');
            setPaymentData(payment);
            
            // Update order status to paid
            if (payment.order_id) {
              const { error: updateError } = await supabase
                .from('orders')
                .update({ payment_status: 'paid' })
                .eq('id', payment.order_id);
              
              if (updateError) {
                console.error('Error updating order status:', updateError);
              }
            }
            
            toast({
              title: "Payment Successful!",
              description: `Payment of KES ${payment.amount} completed successfully.`,
            });
          } else if (payment.status === 'failed') {
            setStatus('failed');
            setPaymentData(payment);
            toast({
              title: "Payment Failed",
              description: "Your M-PESA payment was not successful.",
              variant: "destructive"
            });
          } else if (attempts >= maxAttempts) {
            // Timeout - payment is still pending
            setStatus('failed');
            toast({
              title: "Payment Timeout",
              description: "Payment verification timed out. Please check your M-PESA messages or contact support.",
              variant: "destructive"
            });
          } else {
            // Still pending, continue polling
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
  }, [checkoutRequestID, toast]);

  const handleGoHome = () => {
    navigate('/');
  };

  const handleViewOrders = () => {
    navigate('/dashboard');
  };

  const renderStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />;
      case 'failed':
        return <XCircle className="h-16 w-16 text-red-500 mx-auto" />;
      default:
        return <Clock className="h-16 w-16 text-blue-500 mx-auto animate-spin" />;
    }
  };

  const renderStatusMessage = () => {
    switch (status) {
      case 'success':
        return (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-green-700">Payment Successful!</h2>
            <p className="text-gray-600">
              Your M-PESA payment has been processed successfully.
            </p>
            {paymentData?.metadata?.mpesa_receipt_number && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>M-PESA Receipt:</strong> {paymentData.metadata.mpesa_receipt_number}
                </p>
                <p className="text-sm text-green-800">
                  <strong>Amount:</strong> KES {paymentData.amount?.toLocaleString()}
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleViewOrders} className="flex items-center gap-2">
                View My Orders
              </Button>
              <Button variant="outline" onClick={handleGoHome} className="flex items-center gap-2">
                <ArrowLeft size={16} />
                Continue Shopping
              </Button>
            </div>
          </div>
        );
      case 'failed':
        return (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-red-700">Payment Failed</h2>
            <p className="text-gray-600">
              Your M-PESA payment could not be processed. Please try again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={() => navigate('/checkout')} className="flex items-center gap-2">
                Try Again
              </Button>
              <Button variant="outline" onClick={handleGoHome} className="flex items-center gap-2">
                <ArrowLeft size={16} />
                Back to Home
              </Button>
            </div>
          </div>
        );
      default:
        return (
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-blue-700">Processing Payment</h2>
            <p className="text-gray-600">
              Please wait while we verify your M-PESA payment...
            </p>
            <p className="text-sm text-gray-500">
              Check your phone for M-PESA prompts and enter your PIN to complete the payment.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex flex-col items-center space-y-4">
                {renderStatusIcon()}
                M-PESA Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderStatusMessage()}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default MpesaCallback;

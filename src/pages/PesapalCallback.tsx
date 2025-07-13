import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PesapalCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get payment info from localStorage
        const storedPayment = localStorage.getItem('pesapal_payment');
        if (storedPayment) {
          const paymentInfo = JSON.parse(storedPayment);
          setPaymentData(paymentInfo);
          
          // Clear the stored payment info
          localStorage.removeItem('pesapal_payment');
        }

        // Check URL parameters for payment status
        const orderTrackingId = searchParams.get('OrderTrackingId');
        const merchantReference = searchParams.get('OrderMerchantReference');
        
        console.log('Pesapal callback params:', { orderTrackingId, merchantReference });

        if (orderTrackingId && merchantReference) {
          // Payment was processed, show success (IPN will handle verification)
          setStatus('success');
          clearCart();
          
          toast({
            title: "Payment Submitted!",
            description: "Your payment is being processed. You will receive confirmation shortly.",
          });

          // Redirect to order success after a delay
          setTimeout(() => {
            navigate('/order-success', {
              state: {
                orderId: paymentData?.orderId || 'unknown',
                paymentMethod: 'pesapal',
                amount: paymentData?.amount || 0,
                currency: paymentData?.currency || 'KES'
              }
            });
          }, 3000);
        } else {
          // No tracking ID means payment failed or was cancelled
          setStatus('failed');
          toast({
            title: "Payment Failed",
            description: "Your payment could not be processed. Please try again.",
            variant: "destructive"
          });
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
  }, [searchParams, navigate, toast, clearCart, paymentData]);

  const handleRetry = () => {
    navigate('/checkout');
  };

  const handleViewOrders = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                {status === 'loading' && (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    Processing Payment
                  </>
                )}
                {status === 'success' && (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    Payment Successful
                  </>
                )}
                {status === 'failed' && (
                  <>
                    <XCircle className="h-6 w-6 text-red-600" />
                    Payment Failed
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {status === 'loading' && (
                <p className="text-gray-600">
                  Please wait while we process your payment...
                </p>
              )}
              
              {status === 'success' && (
                <>
                  <p className="text-green-600">
                    Your payment has been submitted successfully!
                  </p>
                  <p className="text-sm text-gray-600">
                    You will receive a confirmation message shortly. 
                    Redirecting to order confirmation...
                  </p>
                  {paymentData && (
                    <div className="bg-gray-50 p-4 rounded-lg text-sm">
                      <p><strong>Amount:</strong> {paymentData.currency} {paymentData.amount?.toLocaleString()}</p>
                      <p><strong>Order ID:</strong> {paymentData.orderId}</p>
                    </div>
                  )}
                  <Button onClick={handleViewOrders} className="w-full">
                    View My Orders
                  </Button>
                </>
              )}
              
              {status === 'failed' && (
                <>
                  <p className="text-red-600">
                    Your payment could not be processed.
                  </p>
                  <p className="text-sm text-gray-600">
                    This could be due to insufficient funds, cancelled payment, or network issues.
                  </p>
                  <div className="space-y-2">
                    <Button onClick={handleRetry} className="w-full">
                      Try Again
                    </Button>
                    <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                      Return to Homepage
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PesapalCallback;
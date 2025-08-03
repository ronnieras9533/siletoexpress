
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Home, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PesapalCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clearCart } = useCart();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'cancelled'>('loading');
  const [paymentData, setPaymentData] = useState<any>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get payment info from localStorage
        const storedPayment = localStorage.getItem('pesapal_payment');
        if (storedPayment) {
          const paymentInfo = JSON.parse(storedPayment);
          setPaymentData(paymentInfo);
          console.log('Retrieved stored payment info:', paymentInfo);
        }

        // Check URL parameters for payment status
        const orderTrackingId = searchParams.get('OrderTrackingId');
        const merchantReference = searchParams.get('OrderMerchantReference');
        
        console.log('Pesapal callback params:', { orderTrackingId, merchantReference });

        if (orderTrackingId && merchantReference) {
          // Payment was processed successfully
          setStatus('success');
          
          // Clear cart and stored payment info
          clearCart();
          localStorage.removeItem('pesapal_payment');
          
          toast({
            title: "Payment Successful!",
            description: "Your payment has been processed successfully. Your order is being prepared.",
          });

          // Redirect to order success after a delay
          setTimeout(() => {
            navigate('/order-success', {
              state: {
                orderId: paymentData?.orderId || merchantReference,
                paymentMethod: 'pesapal',
                amount: paymentData?.amount || 0,
                currency: paymentData?.currency || 'KES',
                orderTrackingId: orderTrackingId
              }
            });
          }, 3000);
        } else {
          // Check if it's a cancelled payment
          const cancelled = searchParams.get('cancelled');
          if (cancelled === 'true') {
            setStatus('cancelled');
            toast({
              title: "Payment Cancelled",
              description: "Your payment was cancelled. You can try again.",
              variant: "destructive"
            });
          } else {
            // No tracking ID means payment failed
            setStatus('failed');
            toast({
              title: "Payment Failed",
              description: "Your payment could not be processed. Please try again.",
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
  }, [searchParams, navigate, toast, clearCart, paymentData?.orderId, paymentData?.amount, paymentData?.currency]);

  const handleRetry = () => {
    navigate('/checkout');
  };

  const handleViewOrders = () => {
    navigate('/dashboard');
  };

  const handleContinueShopping = () => {
    navigate('/products');
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center space-y-4">
            <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Processing Payment</h2>
            <p className="text-gray-600">
              Please wait while we process your payment...
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-green-700 mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-4">
                Your payment has been processed successfully. Your order is being prepared.
              </p>
              {paymentData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800">
                    <strong>Amount:</strong> {paymentData.currency} {paymentData.amount?.toLocaleString()}
                  </p>
                  <p className="text-sm text-green-800">
                    <strong>Order ID:</strong> {paymentData.orderId}
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500">
                Redirecting to order confirmation...
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleViewOrders}>
                View My Orders
              </Button>
              <Button variant="outline" onClick={handleContinueShopping}>
                <ShoppingBag className="mr-2 h-4 w-4" />
                Continue Shopping
              </Button>
            </div>
          </div>
        );

      case 'cancelled':
        return (
          <div className="text-center space-y-6">
            <XCircle className="h-16 w-16 text-yellow-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-yellow-700 mb-2">Payment Cancelled</h2>
              <p className="text-gray-600">
                Your payment was cancelled. No charges were made to your account.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleRetry}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </div>
          </div>
        );

      case 'failed':
      default:
        return (
          <div className="text-center space-y-6">
            <XCircle className="h-16 w-16 text-red-500 mx-auto" />
            <div>
              <h2 className="text-2xl font-bold text-red-700 mb-2">Payment Failed</h2>
              <p className="text-gray-600">
                Your payment could not be processed. This could be due to insufficient funds, network issues, or other technical problems.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleRetry}>
                Try Again
              </Button>
              <Button variant="outline" onClick={() => navigate('/')}>
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </div>
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
              <CardTitle>Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              {renderContent()}
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PesapalCallback;

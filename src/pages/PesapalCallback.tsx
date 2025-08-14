import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Home, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client'; // Ensure this is imported
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
        const orderTrackingId = searchParams.get('OrderTrackingId');
        const merchantReference = searchParams.get('OrderMerchantReference');
        const cancelled = searchParams.get('cancelled');

        console.log('Pesapal callback params:', { orderTrackingId, merchantReference, cancelled });

        if (!orderTrackingId || !merchantReference) {
          if (cancelled === 'true') {
            setStatus('cancelled');
            toast({
              title: "Payment Cancelled",
              description: "Your payment was cancelled. No charges were made to your account.",
              variant: "destructive"
            });
          } else {
            setStatus('failed');
            toast({
              title: "Payment Failed",
              description: "Invalid callback parameters. Please try again.",
              variant: "destructive"
            });
          }
          return;
        }

        // Verify payment status with Supabase
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('transaction_id', orderTrackingId)
          .eq('pesapal_tracking_id', orderTrackingId)
          .single();

        if (error || !data) {
          console.error('Payment verification error:', error);
          setStatus('failed');
          toast({
            title: "Payment Verification Failed",
            description: "Could not verify your payment. Please contact support.",
            variant: "destructive"
          });
          return;
        }

        if (data.status === 'completed') {
          setPaymentData(data.metadata);
          setStatus('success');
          clearCart();
          toast({
            title: "Payment Successful!",
            description: "Your payment has been processed successfully. Your order is being prepared.",
          });
          setTimeout(() => {
            navigate('/order-success', {
              state: {
                orderId: data.metadata?.merchant_reference || merchantReference,
                paymentMethod: 'pesapal',
                amount: data.amount,
                currency: data.currency,
                orderTrackingId: orderTrackingId
              }
            });
          }, 3000);
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          setStatus(data.status);
          toast({
            title: data.status === 'failed' ? "Payment Failed" : "Payment Cancelled",
            description: `Your payment ${data.status}. Please try again or contact support.`,
            variant: "destructive"
          });
        } else {
          setStatus('failed');
          toast({
            title: "Payment Pending",
            description: "Payment status is pending. Please check later or contact support.",
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
  }, [searchParams, navigate, toast, clearCart]);

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
                    <strong>Order ID:</strong> {paymentData.merchant_reference}
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

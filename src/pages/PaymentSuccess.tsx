
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, XCircle, Home, ShoppingBag } from 'lucide-react';
// Flutterwave service removed - replaced with Pesapal
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'success' | 'failed' | 'pending'>('pending');
  const [transactionData, setTransactionData] = useState<any>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const txRef = urlParams.get('tx_ref');
    const orderId = urlParams.get('order_id');
    const status = urlParams.get('status');

    if (!txRef) {
      navigate('/');
      return;
    }

    const verifyPayment = async () => {
      try {
        if (status === 'successful') {
          // Legacy flutterwave verification - redirecting to Pesapal flow
          navigate('/pesapal-callback');
          return;
        } else {
          setPaymentStatus('failed');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setPaymentStatus('failed');
        toast({
          title: "Verification Error",
          description: "Unable to verify payment status. Please contact support.",
          variant: "destructive"
        });
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [location.search, navigate, toast]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
                  <p className="text-gray-600">Please wait while we confirm your payment...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                {paymentStatus === 'success' ? (
                  <CheckCircle className="h-16 w-16 text-green-500" />
                ) : (
                  <XCircle className="h-16 w-16 text-red-500" />
                )}
              </div>
              <CardTitle className={`text-2xl ${paymentStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {paymentStatus === 'success' ? 'Payment Successful!' : 'Payment Failed'}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {paymentStatus === 'success' && transactionData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">Transaction Details</h3>
                  <div className="space-y-1 text-sm text-green-700">
                    <p>Transaction ID: <span className="font-mono">{transactionData.tx_ref}</span></p>
                    <p>Amount: {transactionData.currency} {transactionData.amount?.toLocaleString()}</p>
                    <p>Payment Method: Card Payment</p>
                    <p>Status: Successful</p>
                  </div>
                </div>
              )}

              {paymentStatus === 'failed' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-medium text-red-800 mb-2">Payment Failed</h3>
                  <p className="text-sm text-red-700">
                    Your payment could not be processed. Please try again or contact our support team for assistance.
                  </p>
                </div>
              )}

              <div className="text-center space-y-2">
                {paymentStatus === 'success' ? (
                  <>
                    <p className="text-lg font-medium">Thank you for your payment!</p>
                    <p className="text-gray-600">
                      You will receive a confirmation email shortly. Your order is now being processed.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-medium">Payment was not completed</p>
                    <p className="text-gray-600">
                      You can try again or contact our support team for help.
                    </p>
                  </>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
                <Button 
                  onClick={() => navigate('/products')}
                  className="flex-1"
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Continue Shopping
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PaymentSuccess;

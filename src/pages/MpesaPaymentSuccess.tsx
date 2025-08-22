import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Loader2, Home, ShoppingBag } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const MpesaPaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [transactionData, setTransactionData] = useState<any>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const checkoutRequestId = urlParams.get('checkout_request_id');
    const orderId = urlParams.get('order_id');

    if (checkoutRequestId && orderId) {
      setTransactionData({
        checkoutRequestId,
        orderId
      });
      setLoading(false);
    } else {
      toast({
        title: "Invalid redirect",
        description: "Missing payment information. Please check your order history.",
        variant: "destructive"
      });
      navigate('/');
    }
  }, [location.search, navigate, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Loading</h2>
                  <p className="text-gray-600">Please wait while we load your payment details...</p>
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
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl text-green-600">
                Payment Successful!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-medium text-green-800 mb-2">Transaction Details</h3>
                <div className="space-y-1 text-sm text-green-700">
                  <p>Order ID: <span className="font-mono">{transactionData.orderId}</span></p>
                  <p>Transaction Reference: <span className="font-mono">{transactionData.checkoutRequestId}</span></p>
                  <p>Status: Successful</p>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Thank you for your payment!</p>
                <p className="text-gray-600">
                  You will receive a confirmation email shortly. Your order is now being processed.
                </p>
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

export default MpesaPaymentSuccess;

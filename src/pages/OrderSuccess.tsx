
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Home, ShoppingBag, MapPin } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    orderId, 
    hasPrescriptionItems, 
    totalAmount, 
    county,
    deliveryFee,
    deliveryInstructions 
  } = location.state || {};

  if (!orderId) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl text-green-600">Order Placed Successfully!</CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-lg font-medium">Thank you for your order!</p>
                <p className="text-gray-600">
                  Your order ID is: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{orderId}</span>
                </p>
                <p className="text-gray-600">
                  Total Amount: <span className="font-bold text-blue-600">KES {totalAmount?.toLocaleString()}</span>
                </p>
              </div>

              {/* Delivery Information */}
              {county && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <MapPin size={16} />
                    <span className="font-medium">Delivery Information</span>
                  </div>
                  <div className="space-y-1 text-sm text-blue-700">
                    <p><span className="font-medium">County:</span> {county}</p>
                    {deliveryFee !== undefined && (
                      <p><span className="font-medium">Delivery Fee:</span> {deliveryFee === 0 ? 'Free' : `KES ${deliveryFee.toLocaleString()}`}</p>
                    )}
                    {deliveryInstructions && (
                      <p><span className="font-medium">Instructions:</span> {deliveryInstructions}</p>
                    )}
                  </div>
                </div>
              )}

              {hasPrescriptionItems && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-800 mb-2">
                    <AlertCircle size={16} />
                    <span className="font-medium">Prescription Verification Required</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Your order contains prescription medications that require verification by our pharmacist. 
                    Please upload your prescription to complete the order.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => navigate('/prescription-upload', { state: { orderId } })}
                  >
                    Upload Prescription
                  </Button>
                </div>
              )}

              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">What happens next?</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• You'll receive an SMS confirmation shortly</li>
                    <li>• Our pharmacist will verify your order</li>
                    {hasPrescriptionItems && <li>• Prescription items will be reviewed separately</li>}
                    <li>• We'll prepare your order for delivery</li>
                    <li>• You'll receive delivery tracking information</li>
                    <li>• You'll be notified when your order is delivered</li>
                  </ul>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Need help?</h3>
                  <p className="text-sm text-gray-600">
                    Contact us at <span className="font-medium">+254 718 925 368</span> or email{' '}
                    <span className="font-medium">support@sileto-pharmaceuticals.com</span>
                  </p>
                </div>
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

export default OrderSuccess;

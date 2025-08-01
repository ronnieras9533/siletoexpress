import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ShoppingBag, User, CreditCard, Smartphone, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import KenyaCountiesSelect from '@/components/KenyaCountiesSelect';
import OrderPrescriptionUpload from '@/components/OrderPrescriptionUpload';
import LoginModal from '@/components/LoginModal';
import PesapalPaymentButton from '@/components/PesapalPaymentButton';
import PayPalPaymentButton from '@/components/PayPalPaymentButton';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { supabase } from '@/integrations/supabase/client';

const Checkout = () => {
  const { items, total, clearCart, hasPrescriptionItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [prescriptionFile, setPrescriptionFile] = useState(null);
  const [uploadingPrescription, setUploadingPrescription] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    notes: ''
  });
  const [selectedCounty, setSelectedCounty] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'pesapal' | 'paypal'>('pesapal');
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    setFormData(prev => ({
      ...prev,
      email: user.email || '',
    }));
  }, [user]);

  useEffect(() => {
    const calculateDelivery = async () => {
      if (selectedCounty && total > 0) {
        try {
          const { data, error } = await supabase.functions.invoke('calculate-delivery', {
            body: {
              county_name: selectedCounty,
              order_total: total
            }
          });

          if (error) {
            console.error("Function error:", error);
            toast({
              title: "Delivery Error",
              description: "Failed to calculate delivery fee.",
              variant: "destructive"
            });
            setDeliveryFee(0);
          } else {
            setDeliveryFee(data);
          }
        } catch (err) {
          console.error("Unexpected error:", err);
          toast({
            title: "Delivery Error",
            description: "Unexpected error calculating delivery.",
            variant: "destructive"
          });
          setDeliveryFee(0);
        }
      } else {
        setDeliveryFee(0);
      }
    };

    calculateDelivery();
  }, [selectedCounty, total, toast]);

  const grandTotal = total + deliveryFee;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handlePrescriptionUploaded = (id: string) => {
    setPrescriptionId(id);
  };

  const handlePaymentSuccess = (transactionData: any) => {
    console.log('Payment successful:', transactionData);
    navigate('/order-success', {
      state: {
        orderData: {
          items,
          total: grandTotal,
          transactionId: transactionData.transaction_id || transactionData.trackingId,
          paymentMethod: paymentMethod,
          customerInfo: {
            email: formData.email,
            phone: formData.phone,
            name: user?.user_metadata?.full_name || 'Customer'
          }
        }
      }
    });
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    toast({
      title: "Payment Error",
      description: error,
      variant: "destructive"
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
            <p className="text-gray-600">Complete your order details</p>
          </div>

          {items.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <ShoppingBag className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
                <p className="text-gray-600 mb-4">Add some products to get started</p>
                <Button onClick={() => navigate('/products')}>
                  Continue Shopping
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                {/* Order Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ShoppingBag className="mr-2 h-5 w-5" />
                      Order Summary ({items.length} items)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={item.id} className="flex items-center space-x-4 py-2">
                          <img
                            src={item.image_url || '/placeholder.svg'}
                            alt={item.name}
                            className="h-16 w-16 rounded-lg object-cover"
                          />
                          <div className="flex-1">
                            <h3 className="font-medium">{item.name}</h3>
                            <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                          </div>
                          <p className="font-semibold">KES {(item.price * item.quantity).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>KES {total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Delivery Fee</span>
                        <span>KES {deliveryFee.toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span>KES {grandTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Prescription Upload */}
                {hasPrescriptionItems() && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-orange-600">
                        <AlertTriangle className="mr-2 h-5 w-5" />
                        Prescription Required
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">
                        Your cart contains prescription items. Please upload a valid prescription to proceed.
                      </p>
                      <OrderPrescriptionUpload 
                        onPrescriptionUploaded={handlePrescriptionUploaded}
                        onCancel={() => {}}
                        prescriptionItems={items.filter(item => item.requires_prescription).map(item => ({ id: item.id, name: item.name }))}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <User className="mr-2 h-5 w-5" />
                      Customer Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!user ? (
                      <div className="text-center py-4">
                        <p className="text-gray-600 mb-4">Please log in to continue with checkout</p>
                        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
                        <Button onClick={() => setShowLoginModal(true)}>Login</Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="e.g. john@example.com"
                            value={formData.email || ''}
                            onChange={handleInputChange}
                            required
                          />
                          <p className="text-sm text-gray-600 mt-1">
                            We'll send your order confirmation here.
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            name="phone"
                            type="tel"
                            placeholder="e.g. 0712345678"
                            value={formData.phone}
                            onChange={handleInputChange}
                            required
                          />
                          <p className="text-sm text-gray-600 mt-1">
                            For delivery updates via SMS.
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="county">County</Label>
                          <KenyaCountiesSelect
                            value={selectedCounty}
                            onValueChange={setSelectedCounty}
                            required
                          />
                          <p className="text-sm text-gray-600 mt-1">
                            Delivery fee: KES {deliveryFee.toLocaleString()}
                            {deliveryFee === 0 && total >= 2000 && " (Free delivery for orders over KES 2,000)"}
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="address">Delivery Address</Label>
                          <Textarea
                            id="address"
                            name="address"
                            placeholder="Enter your full delivery address including building/house number, street, and any landmarks"
                            value={formData.address}
                            onChange={handleInputChange}
                            required
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label htmlFor="city">City/Town</Label>
                          <Input
                            id="city"
                            name="city"
                            placeholder="e.g. Nairobi"
                            value={formData.city}
                            onChange={handleInputChange}
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="notes">Additional Notes (Optional)</Label>
                          <Textarea
                            id="notes"
                            name="notes"
                            placeholder="Any special delivery instructions or notes"
                            value={formData.notes}
                            onChange={handleInputChange}
                            rows={2}
                          />
                        </div>
                      </form>
                    )}
                  </CardContent>
                </Card>

                {/* Payment Methods */}
                {user && (!hasPrescriptionItems() || prescriptionId) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <CreditCard className="mr-2 h-5 w-5" />
                        Payment Method
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Payment Method Selection */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="pesapal"
                            name="paymentMethod"
                            value="pesapal"
                            checked={paymentMethod === 'pesapal'}
                            onChange={(e) => setPaymentMethod(e.target.value as 'pesapal' | 'paypal')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <Label htmlFor="pesapal" className="flex items-center cursor-pointer">
                            <Smartphone className="mr-2 h-4 w-4" />
                            M-Pesa & Card (via Pesapal)
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id="paypal"
                            name="paymentMethod"
                            value="paypal"
                            checked={paymentMethod === 'paypal'}
                            onChange={(e) => setPaymentMethod(e.target.value as 'pesapal' | 'paypal')}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                          />
                          <Label htmlFor="paypal" className="flex items-center cursor-pointer">
                            <CreditCard className="mr-2 h-4 w-4" />
                            PayPal & International Cards
                          </Label>
                        </div>
                      </div>

                      <Separator />

                      {/* Payment Buttons */}
                      <div className="space-y-3">
                        {paymentMethod === 'pesapal' ? (
                          <div className="space-y-3">
                            <PesapalPaymentButton
                              amount={grandTotal}
                              currency="KES"
                              customerInfo={{
                                email: formData.email,
                                phone: formData.phone,
                                name: user?.user_metadata?.full_name || 'Customer'
                              }}
                              formData={formData}
                              prescriptionId={prescriptionId}
                              onSuccess={handlePaymentSuccess}
                              onError={handlePaymentError}
                              paymentType="card"
                            />
                            <PesapalPaymentButton
                              amount={grandTotal}
                              currency="KES"
                              customerInfo={{
                                email: formData.email,
                                phone: formData.phone,
                                name: user?.user_metadata?.full_name || 'Customer'
                              }}
                              formData={formData}
                              prescriptionId={prescriptionId}
                              onSuccess={handlePaymentSuccess}
                              onError={handlePaymentError}
                              paymentType="mobile"
                            />
                          </div>
                        ) : (
                          <PayPalPaymentButton
                            amount={grandTotal}
                            currency="USD"
                            customerInfo={{
                              email: formData.email,
                              phone: formData.phone,
                              name: user?.user_metadata?.full_name || 'Customer'
                            }}
                            formData={formData}
                            prescriptionId={prescriptionId}
                            onSuccess={handlePaymentSuccess}
                            onError={handlePaymentError}
                          />
                        )}
                      </div>

                      <div className="text-xs text-gray-500 mt-4">
                        <p>🔒 Your payment information is secure and encrypted.</p>
                        <p>💳 We support major credit cards, M-Pesa, and PayPal.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Checkout;

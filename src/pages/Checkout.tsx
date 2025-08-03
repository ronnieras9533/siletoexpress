
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CreditCard, Smartphone } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoginModal from '@/components/LoginModal';
import MpesaPaymentButton from '@/components/payments/MpesaPaymentButton';
import PesapalPaymentButton from '@/components/PesapalPaymentButton';

// Function to calculate delivery fee based on county and order amount
const calculateDeliveryFee = (county: string, orderAmount: number): number => {
  // Free delivery for orders above KES 2000
  if (orderAmount >= 2000) return 0;
  
  // Different rates for different counties
  const nairobiCounties = ['nairobi', 'kiambu', 'machakos', 'kajiado'];
  const majorCounties = ['mombasa', 'nakuru', 'eldoret', 'kisumu', 'thika'];
  
  if (nairobiCounties.includes(county.toLowerCase())) {
    return 200;
  } else if (majorCounties.includes(county.toLowerCase())) {
    return 300;
  } else {
    return 400;
  }
};

const Checkout = () => {
  const navigate = useNavigate();
  const { items, clearCart, getTotalAmount } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    city: '',
    county: '',
    notes: ''
  });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'card' | 'mobile'>('mobile');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const subtotal = getTotalAmount();
  const deliveryFee = formData.county ? calculateDeliveryFee(formData.county, subtotal) : 200;
  const total = subtotal + deliveryFee;

  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
      return;
    }

    if (!user) {
      setShowLoginModal(true);
      return;
    }
  }, [items.length, user, navigate]);

  useEffect(() => {
    const isValid = formData.phone.trim() &&
      formData.address.trim() &&
      formData.city.trim() &&
      formData.county &&
      validateKenyanPhone(formData.phone);
    
    setIsFormValid(isValid);
  }, [formData]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateKenyanPhone = (phone: string) => /^(0|\+254|254)\d{9}$/.test(phone.replace(/\s+/g, ''));

  const handlePaymentSuccess = (txnData: any) => {
    toast({ 
      title: 'Payment successful', 
      description: 'Your payment has been processed successfully' 
    });
    clearCart();
    navigate('/payment-success', { 
      state: { 
        txnData, 
        formData, 
        total,
        items 
      } 
    });
  };

  const handlePaymentError = (err: string) => {
    toast({ 
      title: 'Payment Failed', 
      description: err, 
      variant: 'destructive' 
    });
  };

  const counties = [
    'Nairobi', 'Mombasa', 'Kiambu', 'Nakuru', 'Machakos', 'Eldoret', 'Kisumu', 
    'Thika', 'Kajiado', 'Murang\'a', 'Nyeri', 'Meru', 'Embu', 'Kitui', 'Garissa'
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <LoginModal 
          isOpen={showLoginModal} 
          onClose={() => {
            setShowLoginModal(false);
            navigate('/');
          }} 
        />
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/cart')}
            className="mb-6 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Cart
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center py-2 border-b">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">KES {(item.price * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
                <div className="space-y-2 pt-4">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>KES {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>KES {deliveryFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total:</span>
                    <span>KES {total.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0712345678"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={!validateKenyanPhone(formData.phone) && formData.phone ? 'border-red-500' : ''}
                    />
                    {!validateKenyanPhone(formData.phone) && formData.phone && (
                      <p className="text-sm text-red-500 mt-1">Please enter a valid Kenyan phone number</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="address">Delivery Address</Label>
                    <Textarea
                      id="address"
                      placeholder="Enter your full delivery address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City/Town</Label>
                      <Input
                        id="city"
                        placeholder="Enter city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="county">County</Label>
                      <Select value={formData.county} onValueChange={(value) => handleInputChange('county', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select county" />
                        </SelectTrigger>
                        <SelectContent>
                          {counties.map((county) => (
                            <SelectItem key={county} value={county.toLowerCase()}>
                              {county}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Special Instructions (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any special delivery instructions..."
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Method</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <Button
                      onClick={() => setSelectedPaymentMethod('mobile')}
                      variant={selectedPaymentMethod === 'mobile' ? 'default' : 'outline'}
                    >
                      <Smartphone className="mr-2 h-4 w-4" />
                      M‑PESA
                    </Button>
                    <Button
                      onClick={() => setSelectedPaymentMethod('card')}
                      variant={selectedPaymentMethod === 'card' ? 'default' : 'outline'}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Card
                    </Button>
                  </div>

                  {isFormValid && (
                    <div className="space-y-4">
                      {selectedPaymentMethod === 'mobile' ? (
                        <MpesaPaymentButton
                          paymentData={{
                            amount: total,
                            phoneNumber: formData.phone,
                            orderId: `ORD_${Date.now()}`,
                            accountReference: `SiletoExpress_${Date.now()}`,
                            transactionDesc: `Payment for ${items.length} items`
                          }}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                        />
                      ) : (
                        <PesapalPaymentButton
                          amount={total}
                          currency="KES"
                          customerInfo={{
                            email: user?.email!,
                            phone: formData.phone,
                            name: user?.user_metadata?.full_name || user?.email!
                          }}
                          formData={formData}
                          onSuccess={handlePaymentSuccess}
                          onError={handlePaymentError}
                          paymentType="card"
                        />
                      )}
                    </div>
                  )}

                  {!isFormValid && (
                    <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800">
                        Please fill in all required fields with valid information to proceed with payment.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Checkout;

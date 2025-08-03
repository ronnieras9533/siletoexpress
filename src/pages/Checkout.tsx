
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
import PesapalPaymentButton from '@/components/PesapalPaymentButton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CreditCard, Smartphone } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import LoginModal from '@/components/LoginModal';

// Kenyan counties for delivery
const kenyanCounties = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo-Marakwet', 'Embu', 'Garissa',
  'Homa Bay', 'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi',
  'Kirinyaga', 'Kisii', 'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos',
  'Makueni', 'Mandera', 'Marsabit', 'Meru', 'Migori', 'Mombasa', 'Murang\'a',
  'Nairobi', 'Nakuru', 'Nandi', 'Narok', 'Nyamira', 'Nyandarua', 'Nyeri',
  'Samburu', 'Siaya', 'Taita-Taveta', 'Tana River', 'Tharaka-Nithi', 'Trans Nzoia',
  'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
];

// Calculate delivery fee based on county and order total
const calculateDeliveryFee = (county: string, orderTotal: number): number => {
  if (orderTotal >= 2000) return 0; // Free delivery for orders over 2000
  
  const nairobi = ['Nairobi', 'Kiambu', 'Kajiado', 'Murang\'a', 'Machakos'];
  const majorTowns = ['Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Nyeri', 'Meru'];
  
  if (nairobi.includes(county)) return 200;
  if (majorTowns.includes(county)) return 300;
  return 400; // Remote areas
};

const Checkout = () => {
  const navigate = useNavigate();
  const { items, clearCart, getTotalAmount, showLoginModal, setShowLoginModal } = useCart();
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
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const subtotal = getTotalAmount();
  const deliveryFee = formData.county ? calculateDeliveryFee(formData.county, subtotal) : 200;
  const total = subtotal + deliveryFee;

  // Memoize form validation to prevent re-render loops
  const isFormValid = useMemo(() => {
    return Boolean(
      formData.phone.trim() &&
      formData.address.trim() &&
      formData.city.trim() &&
      formData.county
    );
  }, [formData]);

  // Scroll to top and set page title
  useEffect(() => {
    document.title = "Checkout - SiletoExpress";
    window.scrollTo(0, 0);
  }, []);

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items, navigate]);

  // Load user profile data
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        phone: user.phone || prev.phone
      }));
    }
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Please Sign In</h1>
          <p className="text-gray-600 mb-4">You need to be signed in to proceed with checkout.</p>
          <Button onClick={() => navigate('/auth')}>
            Sign In
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
          <Button onClick={() => navigate('/products')}>
            Continue Shopping
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  // Add phone number validation helper
  const validateKenyanPhone = (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return /^(254|0)[0-9]{9}$/.test(cleaned) || /^[0-9]{10}$/.test(cleaned);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCountyChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      county: value
    }));
  };

  const validateForm = () => {
    if (!formData.phone.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number.",
        variant: "destructive"
      });
      return false;
    }

    if (!validateKenyanPhone(formData.phone)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid Kenyan phone number (e.g., 0712345678 or +254712345678).",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.address.trim()) {
      toast({
        title: "Address required",
        description: "Please enter your delivery address.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.city.trim()) {
      toast({
        title: "City required",
        description: "Please enter your city.",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.county) {
      toast({
        title: "County required",
        description: "Please select your county.",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handlePaymentSuccess = (transactionData: any) => {
    console.log('Payment successful:', transactionData);
    toast({
      title: "Payment Successful!",
      description: "Your order has been confirmed and will be processed shortly.",
    });
    clearCart();
    navigate('/payment-success', { 
      state: { 
        transactionData,
        orderTotal: total,
        deliveryInfo: formData
      }
    });
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    toast({
      title: "Payment Failed",
      description: error || "There was an error processing your payment. Please try again.",
      variant: "destructive"
    });
    setIsProcessingPayment(false);
  };

  const customerInfo = {
    email: user?.email || '',
    phone: formData.phone,
    name: user?.user_metadata?.full_name || user?.email || ''
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/cart')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Cart
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-gray-50"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="0712345678 or +254712345678"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className={!validateKenyanPhone(formData.phone) && formData.phone ? 'border-red-300' : ''}
                  />
                  {formData.phone && !validateKenyanPhone(formData.phone) && (
                    <p className="text-sm text-red-600 mt-1">Please enter a valid Kenyan phone number</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Delivery Information */}
            <Card>
              <CardHeader>
                <CardTitle>Delivery Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">Delivery Address <span className="text-red-500">*</span></Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="Street address, building, apartment"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="Enter your city"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="county">County <span className="text-red-500">*</span></Label>
                    <Select value={formData.county} onValueChange={handleCountyChange} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your county" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg z-50 max-h-60 overflow-y-auto">
                        {kenyanCounties.map((county) => (
                          <SelectItem 
                            key={county} 
                            value={county}
                            className="hover:bg-gray-100 cursor-pointer px-3 py-2"
                          >
                            {county}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="notes">Delivery Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Any special delivery instructions..."
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
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
                    variant={selectedPaymentMethod === 'mobile' ? 'default' : 'outline'}
                    onClick={() => setSelectedPaymentMethod('mobile')}
                    className="flex items-center justify-center"
                  >
                    <Smartphone className="mr-2 h-4 w-4" />
                    M-PESA
                  </Button>
                  <Button
                    variant={selectedPaymentMethod === 'card' ? 'default' : 'outline'}
                    onClick={() => setSelectedPaymentMethod('card')}
                    className="flex items-center justify-center"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Card Payment
                  </Button>
                </div>

                {isFormValid && (
                  <div className="space-y-4">
                    <PesapalPaymentButton
                      amount={total}
                      currency="KES"
                      customerInfo={customerInfo}
                      formData={formData}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                      paymentType={selectedPaymentMethod}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="flex-1">{item.name} x {item.quantity}</span>
                      <span>KES {(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>KES {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee:</span>
                    <span>
                      {deliveryFee === 0 ? 'FREE' : `KES ${deliveryFee.toLocaleString()}`}
                    </span>
                  </div>
                  {deliveryFee === 0 && subtotal >= 2000 && (
                    <p className="text-xs text-green-600">Free delivery for orders over KES 2,000!</p>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>KES {total.toLocaleString()}</span>
                  </div>
                </div>

                {!isFormValid && (
                  <div className="text-center text-sm text-gray-500 mt-4">
                    Please fill in all required fields to proceed with payment
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {showLoginModal && setShowLoginModal && (
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      <Footer />
    </div>
  );
};

export default Checkout;

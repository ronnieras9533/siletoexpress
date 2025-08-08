
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, FileText, MapPin, Phone, Mail, User, Wallet, CreditCard } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import KenyaCountiesSelect from '@/components/KenyaCountiesSelect';
import OrderPrescriptionUpload from '@/components/OrderPrescriptionUpload';
import MpesaPaymentButton from '@/components/payments/MpesaPaymentButton';
import PesapalPaymentButton from '@/components/PesapalPaymentButton';

const Checkout = () => {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    county: '',
    deliveryAddress: '',
    deliveryInstructions: ''
  });
  
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [showPrescriptionUpload, setShowPrescriptionUpload] = useState(false);
  const [prescriptionUploaded, setPrescriptionUploaded] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);

  // Check if any items require prescription
  const requiresPrescription = useMemo(() => {
    return items.some(item => item.prescription_required);
  }, [items]);

  // Get prescription required items
  const prescriptionItems = useMemo(() => {
    return items.filter(item => item.prescription_required);
  }, [items]);

  // Calculate delivery fee when county changes
  useEffect(() => {
    if (formData.county) {
      calculateDeliveryFee();
    }
  }, [formData.county, total]);

  // Load user profile data
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('email, phone, full_name')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (profile) {
        setFormData(prev => ({
          ...prev,
          email: profile.email || '',
          phone: profile.phone || ''
        }));
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const calculateDeliveryFee = async () => {
    try {
      const { data, error } = await supabase
        .rpc('calculate_delivery_fee', {
          county_name: formData.county,
          order_total: total
        });

      if (error) throw error;
      setDeliveryFee(data || 0);
    } catch (error) {
      console.error('Error calculating delivery fee:', error);
      setDeliveryFee(300); // Default fee
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCountySelect = (county: string) => {
    setFormData(prev => ({ ...prev, county }));
  };

  const validateForm = () => {
    const { email, phone, county, deliveryAddress } = formData;
    
    if (!email || !phone || !county || !deliveryAddress) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return false;
    }

    if (requiresPrescription && !prescriptionUploaded) {
      setShowPrescriptionUpload(true);
      toast({
        title: "Prescription Required",
        description: "Please upload your prescription to continue",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handlePrescriptionUploadClick = () => {
    setShowPrescriptionUpload(true);
  };

  const handlePrescriptionSuccess = (prescriptionId: string) => {
    setPrescriptionUploaded(true);
    setShowPrescriptionUpload(false);
    toast({
      title: "Success",
      description: "Prescription uploaded successfully",
    });
  };

  const handlePrescriptionCancel = () => {
    setShowPrescriptionUpload(false);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([
          {
            user_id: user?.id,
            total_amount: total + deliveryFee,
            delivery_address: formData.deliveryAddress,
            delivery_county: formData.county,
            delivery_instructions: formData.deliveryInstructions,
            requires_prescription: requiresPrescription,
            contact_email: formData.email,
            contact_phone: formData.phone,
            status: 'pending'
          }
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      for (const item of items) {
        const { error: orderItemError } = await supabase
          .from('order_items')
          .insert([
            {
              order_id: order.id,
              product_id: item.id,
              quantity: item.quantity,
              price: item.price
            }
          ]);

        if (orderItemError) throw orderItemError;
      }

      // If prescription was uploaded, link it to the order
      if (prescriptionUploaded) {
        const { data: prescription, error: prescriptionError } = await supabase
          .from('prescriptions')
          .select('id')
          .eq('user_id', user?.id)
          .eq('order_id', null)
          .eq('status', 'pending')
          .limit(1)
          .single();

        if (prescriptionError) throw prescriptionError;

        const { error: updateError } = await supabase
          .from('prescriptions')
          .update({ order_id: order.id })
          .eq('id', prescription.id);

        if (updateError) throw updateError;
      }

      // Clear cart
      clearCart();

      toast({
        title: "Order Placed",
        description: "Your order has been placed successfully!",
      });

      // Redirect to payment or order confirmation page
      navigate('/payment-success');
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto text-center">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Your cart is empty</h2>
              <p className="text-gray-600 mb-6">Add some items to your cart before checking out.</p>
              <Button onClick={() => navigate('/products')}>
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-4 lg:py-8">
        <Card className="lg:max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-lg">Checkout</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="mb-2 flex items-center gap-1">
                  <Mail className="h-4 w-4 mr-1 text-gray-500" />
                  Email
                </Label>
                <Input
                  type="email"
                  id="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone" className="mb-2 flex items-center gap-1">
                  <Phone className="h-4 w-4 mr-1 text-gray-500" />
                  Phone Number
                </Label>
                <Input
                  type="tel"
                  id="phone"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Delivery Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="county" className="mb-2 flex items-center gap-1">
                  <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                  County
                </Label>
                <KenyaCountiesSelect 
                  value={formData.county} 
                  onValueChange={handleCountySelect} 
                />
              </div>
              <div>
                <Label htmlFor="deliveryAddress" className="mb-2 flex items-center gap-1">
                  <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                  Delivery Address
                </Label>
                <Input
                  type="text"
                  id="deliveryAddress"
                  placeholder="Enter your delivery address"
                  value={formData.deliveryAddress}
                  onChange={(e) => handleInputChange('deliveryAddress', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="deliveryInstructions" className="mb-2 flex items-center gap-1">
                <FileText className="h-4 w-4 mr-1 text-gray-500" />
                Delivery Instructions (Optional)
              </Label>
              <Textarea
                id="deliveryInstructions"
                placeholder="Enter any delivery instructions"
                value={formData.deliveryInstructions}
                onChange={(e) => handleInputChange('deliveryInstructions', e.target.value)}
              />
            </div>

            <Separator />

            {/* Order Summary */}
            <div>
              <h3 className="text-md font-semibold mb-2">Order Summary</h3>
              <ul className="space-y-2">
                {items.map(item => (
                  <li key={item.id} className="flex justify-between">
                    <span>{item.name} x {item.quantity}</span>
                    <span>KES {Number(item.price * item.quantity).toLocaleString()}</span>
                  </li>
                ))}
                <li className="flex justify-between font-semibold">
                  <span>Subtotal</span>
                  <span>KES {Number(total).toLocaleString()}</span>
                </li>
                <li className="flex justify-between font-semibold">
                  <span>Delivery Fee</span>
                  <span>KES {Number(deliveryFee).toLocaleString()}</span>
                </li>
                <li className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>KES {Number(total + deliveryFee).toLocaleString()}</span>
                </li>
              </ul>
            </div>

            <Separator />

            {/* Prescription Upload */}
            {requiresPrescription && (
              <div>
                <h3 className="text-md font-semibold mb-2">Prescription Upload</h3>
                {!prescriptionUploaded ? (
                  <>
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        A prescription is required for some items in your cart.
                        <Button variant="link" onClick={handlePrescriptionUploadClick}>
                          Upload here
                        </Button>
                      </AlertDescription>
                    </Alert>
                    {showPrescriptionUpload && (
                      <OrderPrescriptionUpload 
                        onPrescriptionUploaded={handlePrescriptionSuccess}
                        onCancel={handlePrescriptionCancel}
                        prescriptionItems={prescriptionItems}
                      />
                    )}
                  </>
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      Prescription uploaded successfully!
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <Separator />

            {/* Payment Method */}
            <div>
              <h3 className="text-md font-semibold mb-2">Payment Method</h3>
              <Select onValueChange={value => setPaymentMethod(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">
                    <Wallet className="h-4 w-4 mr-2" />
                    MPesa
                  </SelectItem>
                  <SelectItem value="card">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Credit Card (Pesapal)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Buttons */}
            <div className="flex justify-center gap-4 mt-4">
              {paymentMethod === 'mpesa' ? (
                <MpesaPaymentButton 
                  paymentData={{
                    amount: total + deliveryFee,
                    phoneNumber: formData.phone,
                    orderId: Date.now().toString(),
                    accountReference: `Order-${Date.now()}`,
                    transactionDesc: 'Online pharmacy order payment'
                  }}
                  onSuccess={() => handleSubmit()}
                  onError={(error) => {
                    toast({
                      title: "Payment Error",
                      description: error,
                      variant: "destructive"
                    });
                  }}
                />
              ) : (
                <PesapalPaymentButton 
                  amount={total + deliveryFee}
                  orderDetails={formData}
                  onSuccess={handleSubmit}
                  isLoading={loading}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
};

export default Checkout;

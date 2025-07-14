import React, { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, CreditCard, AlertCircle, Smartphone, MessageCircle, MapPin, Upload, FileText } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import OrderPrescriptionUpload from '@/components/OrderPrescriptionUpload';
import PesapalPaymentButton from '@/components/PesapalPaymentButton';
import KenyaCountiesSelect from '@/components/KenyaCountiesSelect';

const Checkout = () => {
  const { items, getTotalPrice, hasPrescriptionItems, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPrescriptionUpload, setShowPrescriptionUpload] = useState(false);
  const [prescriptionId, setPrescriptionId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card' | 'mobile'>('mpesa');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);
  const [uploadingPrescription, setUploadingPrescription] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    city: '',
    county: '',
    deliveryInstructions: '',
    notes: ''
  });

  // Calculate delivery fee based on county and order total
  useEffect(() => {
    const calculateDeliveryFee = async () => {
      if (!formData.county) {
        setDeliveryFee(0);
        return;
      }

      const orderTotal = getTotalPrice();
      
      try {
        const { data, error } = await supabase
          .rpc('calculate_delivery_fee', {
            county_name: formData.county,
            order_total: orderTotal
          });

        if (error) {
          console.error('Error calculating delivery fee:', error);
          // Fallback calculation
          if (orderTotal >= 2000) {
            setDeliveryFee(0);
          } else {
            switch (formData.county.toLowerCase()) {
              case 'nairobi':
                setDeliveryFee(0);
                break;
              case 'kiambu':
              case 'kajiado':
              case 'machakos':
                setDeliveryFee(200);
                break;
              default:
                setDeliveryFee(300);
            }
          }
        } else {
          setDeliveryFee(data || 0);
        }
      } catch (error) {
        console.error('Error calculating delivery fee:', error);
        setDeliveryFee(0);
      }
    };

    calculateDeliveryFee();
  }, [formData.county, getTotalPrice]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleCountyChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      county: value
    }));
  };

  const handlePrescriptionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }
      
      if (!selectedFile.type.startsWith('image/') && selectedFile.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please select an image file or PDF",
          variant: "destructive"
        });
        return;
      }
      
      setPrescriptionFile(selectedFile);
    }
  };

  const handlePrescriptionUpload = async () => {
    if (!prescriptionFile || !user) return;

    setUploadingPrescription(true);
    try {
      const fileExt = prescriptionFile.name.split('.').pop();
      const fileName = `${user.id}/order_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('prescriptions')
        .upload(fileName, prescriptionFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('prescriptions')
        .getPublicUrl(fileName);

      // Create prescription record for this order
      const { data: prescription, error: prescriptionError } = await supabase
        .from('prescriptions')
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          status: 'pending',
          admin_notes: `Prescription for items: ${items.filter(item => item.prescription_required).map(item => item.name).join(', ')}`
        })
        .select()
        .single();

      if (prescriptionError) throw prescriptionError;

      setPrescriptionId(prescription.id);
      toast({
        title: "Prescription uploaded successfully!",
        description: "You can now proceed with your order.",
      });
    } catch (error) {
      console.error('Error uploading prescription:', error);
      toast({
        title: "Upload failed",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setUploadingPrescription(false);
    }
  };

  const initiateSTKPush = async (orderId: string, totalAmount: number) => {
    const { mpesaService } = await import('@/services/mpesaService');
    
    const paymentData = {
      phoneNumber: formData.phone,
      amount: totalAmount,
      orderId: orderId,
      accountReference: orderId,
      transactionDesc: `SiletoExpress Order ${orderId}`
    };

    return await mpesaService.initiateSTKPush(paymentData);
  };

  const handlePrescriptionUploaded = (uploadedPrescriptionId: string) => {
    setPrescriptionId(uploadedPrescriptionId);
    setShowPrescriptionUpload(false);
    toast({
      title: "Prescription uploaded!",
      description: "You can now proceed with your order.",
    });
  };

  const handleWhatsAppHelp = () => {
    const orderSummary = items.map(item => 
      `• ${item.name} (Qty: ${item.quantity}) - KES ${(item.price * item.quantity).toLocaleString()}`
    ).join('\n');
    
    const totalAmount = getTotalPrice() + deliveryFee;
    
    const message = `Hi SiletoExpress, I need help with my checkout:

ORDER SUMMARY:
${orderSummary}

Subtotal: KES ${getTotalPrice().toLocaleString()}
Delivery Fee: KES ${deliveryFee.toLocaleString()}
Total: KES ${totalAmount.toLocaleString()}

County: ${formData.county}
${hasPrescriptionItems() ? '⚠️ This order includes prescription items' : ''}

Please assist me with completing this order.`;

    const whatsappUrl = `https://api.whatsapp.com/send?phone=254718925368&text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const createOrder = async () => {
    const totalAmount = getTotalPrice() + deliveryFee;
    
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user!.id,
        total_amount: totalAmount,
        phone_number: formData.phone,
        delivery_address: `${formData.address}, ${formData.city}`,
        county: formData.county,
        delivery_instructions: formData.deliveryInstructions,
        delivery_fee: deliveryFee,
        status: 'pending',
        payment_method: paymentMethod,
        currency: 'KES',
        requires_prescription: hasPrescriptionItems()
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.id,
      quantity: item.quantity,
      price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // If there's a prescription, link it to the order
    if (prescriptionId) {
      await supabase
        .from('prescriptions')
        .update({ order_id: order.id })
        .eq('id', prescriptionId);
    }

    return order;
  };

  const handleMpesaPayment = async () => {
    setLoading(true);
    try {
      const totalAmount = getTotalPrice() + deliveryFee;

      // Create payment intent with order data
      const { data: paymentIntent, error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user!.id,
          method: 'mpesa',
          amount: totalAmount,
          currency: 'KES',
          status: 'pending',
          gateway: 'mpesa',
          metadata: {
            items: items.map(item => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              price: item.price
            })),
            phone_number: formData.phone,
            delivery_address: `${formData.address}, ${formData.city}`,
            county: formData.county,
            delivery_instructions: formData.deliveryInstructions,
            delivery_fee: deliveryFee,
            prescription_id: prescriptionId,
            notes: formData.notes
          }
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      toast({
        title: "Initiating M-PESA Payment",
        description: "Please check your phone for the M-PESA prompt and enter your PIN...",
      });

      const paymentData = {
        phoneNumber: formData.phone,
        amount: totalAmount,
        orderId: paymentIntent.id,
        accountReference: paymentIntent.id,
        transactionDesc: `SiletoExpress Payment ${paymentIntent.id}`
      };

      const paymentResult = await initiateSTKPush(paymentIntent.id, totalAmount);

      if (paymentResult.success && paymentResult.checkoutRequestID) {
        await supabase
          .from('payments')
          .update({ transaction_id: paymentResult.checkoutRequestID })
          .eq('id', paymentIntent.id);

        toast({
          title: "M-PESA Prompt Sent!",
          description: "Please check your phone and enter your M-PESA PIN to complete the payment.",
        });

        navigate(`/mpesa-callback?checkout_request_id=${paymentResult.checkoutRequestID}&payment_id=${paymentIntent.id}`);
      } else {
        throw new Error(paymentResult.error || 'Failed to initiate M-PESA payment');
      }

    } catch (error) {
      console.error('Error processing M-PESA payment:', error);
      toast({
        title: "Payment Error",
        description: error instanceof Error ? error.message : "Failed to process M-PESA payment. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCardPaymentSuccess = (transactionData: any) => {
    clearCart();
    toast({
      title: "Payment Successful!",
      description: "Your card payment has been processed successfully.",
    });
  };

  const handleCardPaymentError = (error: string) => {
    toast({
      title: "Payment Failed",
      description: error,
      variant: "destructive"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
      return;
    }

    // Validate required fields
    if (!formData.county) {
      toast({
        title: "County Required",
        description: "Please select your county for delivery.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.deliveryInstructions.trim()) {
      toast({
        title: "Delivery Instructions Required",
        description: "Please provide delivery instructions (estate, building, landmarks, etc.).",
        variant: "destructive"
      });
      return;
    }

    // Check if prescription items require prescription upload
    if (hasPrescriptionItems() && !prescriptionId) {
      toast({
        title: "Prescription Required",
        description: "Please upload your prescription before proceeding.",
        variant: "destructive"
      });
      return;
    }

    if (paymentMethod === 'mpesa') {
      await handleMpesaPayment();
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  const totalAmount = getTotalPrice() + deliveryFee;
  const prescriptionItems = items.filter(item => item.prescription_required);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/cart')}
            className="flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back to Cart
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Checkout Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment & Delivery Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="0700123456 or 254700123456"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      {paymentMethod === 'mpesa' ? 'Enter the phone number registered with M-PESA' : 'Your contact phone number'}
                    </p>
                  </div>

                  <KenyaCountiesSelect
                    value={formData.county}
                    onValueChange={handleCountyChange}
                    required
                  />

                  {deliveryFee > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-blue-800">
                        <MapPin size={16} />
                        <span className="text-sm">
                          Delivery fee for {formData.county}: KES {deliveryFee.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}

                  {deliveryFee === 0 && formData.county && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-800">
                        <MapPin size={16} />
                        <span className="text-sm">
                          {getTotalPrice() >= 2000 ? 'Free delivery (order over KES 2,000)' : 'Free delivery to ' + formData.county}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      name="address"
                      placeholder="Enter your street address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="city">City/Town</Label>
                    <Input
                      id="city"
                      name="city"
                      placeholder="Enter your city/town"
                      value={formData.city}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="deliveryInstructions">Delivery Instructions <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="deliveryInstructions"
                      name="deliveryInstructions"
                      placeholder="Estate name, building name, apartment number, landmarks, gate code, or any special instructions..."
                      value={formData.deliveryInstructions}
                      onChange={handleInputChange}
                      required
                      rows={3}
                    />
                    <p className="text-sm text-gray-600 mt-1">
                      Please provide specific details to help our delivery team find you easily
                    </p>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      placeholder="Any other special instructions..."
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={2}
                    />
                  </div>

                  {/* Prescription Upload Section */}
                  {hasPrescriptionItems() && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-blue-800 mb-3">
                        <FileText size={16} />
                        <span className="font-medium">Prescription Required</span>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm text-blue-700 mb-2">
                          Items requiring prescription:
                        </p>
                        <ul className="text-sm text-blue-700 space-y-1">
                          {prescriptionItems.map(item => (
                            <li key={item.id}>• {item.name}</li>
                          ))}
                        </ul>
                      </div>

                      {!prescriptionId ? (
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="prescription-file">Upload Prescription</Label>
                            <div className="border-2 border-dashed border-blue-300 rounded-lg p-4 text-center">
                              <input
                                id="prescription-file"
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handlePrescriptionFileChange}
                                className="hidden"
                              />
                              <label
                                htmlFor="prescription-file"
                                className="cursor-pointer flex flex-col items-center"
                              >
                                <Upload className="h-8 w-8 text-blue-400 mb-2" />
                                <p className="text-sm font-medium text-blue-700">
                                  Click to upload prescription
                                </p>
                                <p className="text-xs text-blue-600">
                                  JPG, PNG, PDF (max 10MB)
                                </p>
                              </label>
                            </div>
                          </div>

                          {prescriptionFile && (
                            <div className="bg-white border border-blue-200 rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-blue-800">
                                    {prescriptionFile.name}
                                  </p>
                                  <p className="text-xs text-blue-600">
                                    {(prescriptionFile.size / 1024 / 1024).toFixed(2)} MB
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={handlePrescriptionUpload}
                                  disabled={uploadingPrescription}
                                >
                                  {uploadingPrescription ? 'Uploading...' : 'Upload'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-green-800">
                            <AlertCircle size={16} />
                            <span className="text-sm font-medium">Prescription Uploaded Successfully</span>
                          </div>
                          <p className="text-sm text-green-700 mt-1">
                            Your prescription has been uploaded and is ready for review.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Method Selection */}
                  <div className="space-y-3">
                    <Label>Select Payment Method</Label>
                    <div className="grid grid-cols-1 gap-3">
                      <Button
                        type="button"
                        variant={paymentMethod === 'mpesa' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('mpesa')}
                        className="flex items-center gap-2"
                      >
                        <Smartphone size={16} />
                        M-PESA (Direct)
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMethod === 'card' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('card')}
                        className="flex items-center gap-2"
                      >
                        <CreditCard size={16} />
                        Visa / Mastercard
                      </Button>
                      <Button
                        type="button"
                        variant={paymentMethod === 'mobile' ? 'default' : 'outline'}
                        onClick={() => setPaymentMethod('mobile')}
                        className="flex items-center gap-2"
                      >
                        <Smartphone size={16} />
                        Mobile Money (M-PESA, Airtel)
                      </Button>
                    </div>
                  </div>

                  {/* Payment Buttons */}
                  {paymentMethod === 'mpesa' ? (
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loading || (hasPrescriptionItems() && !prescriptionId) || !formData.county || !formData.deliveryInstructions.trim()}
                    >
                      {loading ? (
                        'Processing Payment...'
                      ) : hasPrescriptionItems() && !prescriptionId ? (
                        'Upload Prescription First'
                      ) : !formData.county ? (
                        'Select County First'
                      ) : !formData.deliveryInstructions.trim() ? (
                        'Add Delivery Instructions'
                      ) : (
                        <>
                          <Smartphone className="mr-2 h-4 w-4" />
                          Pay with M-PESA - KES {totalAmount.toLocaleString()}
                        </>
                      )}
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      {(hasPrescriptionItems() && !prescriptionId) || !formData.county || !formData.deliveryInstructions.trim() ? (
                        <Button 
                          type="button"
                          onClick={() => {
                            if (hasPrescriptionItems() && !prescriptionId) {
                              toast({
                                title: "Prescription Required",
                                description: "Please upload your prescription before proceeding.",
                                variant: "destructive"
                              });
                            } else if (!formData.county) {
                              toast({
                                title: "County Required",
                                description: "Please select your county for delivery.",
                                variant: "destructive"
                              });
                            } else if (!formData.deliveryInstructions.trim()) {
                              toast({
                                title: "Delivery Instructions Required",
                                description: "Please provide delivery instructions.",
                                variant: "destructive"
                              });
                            }
                          }}
                          className="w-full"
                        >
                          {hasPrescriptionItems() && !prescriptionId ? 'Upload Prescription First' : 
                           !formData.county ? 'Select County First' : 'Add Delivery Instructions'}
                        </Button>
                      ) : (
                        <PesapalPaymentButton
                          amount={totalAmount}
                          currency="KES"
                          customerInfo={{
                            email: user.email || '',
                            phone: formData.phone,
                            name: user.user_metadata?.full_name || 'Customer'
                          }}
                          formData={formData}
                          prescriptionId={prescriptionId}
                          onSuccess={handleCardPaymentSuccess}
                          onError={handleCardPaymentError}
                          paymentType={paymentMethod === 'card' ? 'card' : 'mobile'}
                        />
                      )}
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity} × KES {item.price}
                      </p>
                      {item.prescription_required && (
                        <div className="flex items-center gap-1 text-orange-600 text-sm mt-1">
                          <AlertCircle size={14} />
                          <span>Prescription Required</span>
                        </div>
                      )}
                    </div>
                    <span className="font-medium">
                      KES {(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}
                
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>KES {getTotalPrice().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>{deliveryFee === 0 ? 'Free' : `KES ${deliveryFee.toLocaleString()}`}</span>
                  </div>
                  {formData.county && (
                    <div className="text-sm text-gray-600">
                      <span>Delivery to: {formData.county}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span className="text-blue-600">KES {totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                {paymentMethod === 'mpesa' ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Smartphone size={16} />
                      <span className="font-medium">M-PESA Payment</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      You will receive an STK push notification on your phone to complete the payment
                    </p>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <CreditCard size={16} />
                      <span className="font-medium">Card Payment</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      Secure payment with Visa, Mastercard, and other major cards
                    </p>
                  </div>
                )}

                {/* WhatsApp Help Button */}
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleWhatsAppHelp}
                    className="w-full bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                  >
                    <MessageCircle size={16} className="mr-2" />
                    Need Help? Chat with us on WhatsApp
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Checkout;

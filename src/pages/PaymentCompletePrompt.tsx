// File: src/pages/PaymentCompletePrompt.tsx
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";

const PaymentCompletePrompt: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const orderId = searchParams.get("orderId");

  const onComplete = async () => {
    if (!orderId) {
      toast({ title: "Invalid request", description: "Missing orderId", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("finalize-payment", {
      body: { orderId }
    });
    
    setLoading(false);

    if (error || data?.error) {
      toast({
        title: "Cannot finalize yet",
        description: data?.error || error?.message || "Payment not confirmed by provider.",
        variant: "destructive"
      });
      return;
    }
    
    navigate(`/payment-success?orderId=${orderId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Payment Received</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Your payment has been successfully processed. Please click the button below to complete your order.
                </p>
                <p className="text-sm text-gray-500 mb-2">
                  Order ID: {orderId}
                </p>
              </div>
              
              <Button 
                onClick={onComplete} 
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Finalizing...
                  </>
                ) : (
                  "Complete Payment"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PaymentCompletePrompt;

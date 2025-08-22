import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PaymentCompletePrompt: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const orderId = searchParams.get("orderId");

  const handleCompletePayment = async () => {
    if (!orderId) {
      toast({ title: "Invalid Request", description: "Missing order ID." });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.functions.invoke("finalize-payment", {
      body: { orderId },
    });

    setLoading(false);

    if (error || data?.status !== "success") {
      toast({
        title: "Error",
        description: error?.message || "Unable to complete payment.",
        variant: "destructive",
      });
    } else {
      navigate(`/payment/success?orderId=${orderId}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
      <h1 className="text-2xl font-bold mb-4">Payment Received</h1>
      <p className="mb-6">
        Your payment has been received successfully. Please click the button
        below to finalize your order.
      </p>
      <Button onClick={handleCompletePayment} disabled={loading}>
        {loading ? "Finalizing..." : "Complete Payment"}
      </Button>
    </div>
  );
};

export default PaymentCompletePrompt;

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function MpesaCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("Processing payment...");

  useEffect(() => {
    const orderId = searchParams.get("orderId");
    const resultCode = searchParams.get("ResultCode");

    if (!orderId) {
      setStatus("Missing order ID in callback.");
      return;
    }

    if (resultCode === "0") {
      // Payment successful
      supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("id", orderId)
        .then(() => setStatus("Payment successful! Order confirmed."));
    } else {
      // Payment failed
      supabase
        .from("orders")
        .update({ status: "payment_failed" })
        .eq("id", orderId)
        .then(() => setStatus("Payment failed. Please try again."));
    }
  }, [searchParams]);

  return (
    <div className="p-6 text-center">
      <h1 className="text-xl font-bold">{status}</h1>
    </div>
  );
        }

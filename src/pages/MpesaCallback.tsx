import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function MpesaCallback() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("Processing payment...");

  useEffect(() => {
    const handleCallback = async () => {
      const resultCode = searchParams.get("ResultCode");
      const orderId = searchParams.get("orderId");

      if (!orderId) {
        setStatus("Invalid callback: missing order ID.");
        return;
      }

      if (resultCode === "0") {
        // Payment successful
        await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);
        setStatus("Payment successful! Thank you.");
      } else {
        // Payment failed
        await supabase.from("orders").update({ status: "failed" }).eq("id", orderId);
        setStatus("Payment failed. Please try again.");
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="p-6 text-center">
      <h1 className="text-xl font-bold">{status}</h1>
    </div>
  );
}

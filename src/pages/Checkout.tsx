import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Checkout() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const createOrder = async () => {
    const { data, error } = await supabase
      .from("orders")
      .insert([{ total, status: "pending" }])
      .select()
      .single();

    if (error) {
      console.error(error);
      return null;
    }
    return data;
  };

  const handleMpesaPayment = async () => {
    setLoading(true);
    const order = await createOrder();
    if (!order) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/.netlify/functions/mpesa-stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          amount: total,
          orderId: order.id,
          accountReference: `Order-${order.id}`,
          transactionDesc: "SiletoExpress Order Payment"
        })
      });

      const data = await res.json();
      if (data.success) {
        alert("M-PESA STK push sent to your phone. Please complete the payment.");
      } else {
        alert(`Payment error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Payment request failed.");
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Checkout</h1>

      <input
        type="text"
        placeholder="M-PESA Phone Number"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        className="border p-2 w-full my-3"
      />

      <button
        onClick={handleMpesaPayment}
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Processing..." : "Pay with M-PESA"}
      </button>
    </div>
  );
}import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Checkout() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const createOrder = async () => {
    const { data, error } = await supabase
      .from("orders")
      .insert([{ total, status: "pending" }])
      .select()
      .single();

    if (error) {
      console.error(error);
      return null;
    }
    return data;
  };

  const handleMpesaPayment = async () => {
    setLoading(true);
    const order = await createOrder();
    if (!order) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/.netlify/functions/mpesa-stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber,
          amount: total,
          orderId: order.id,
          accountReference: `Order-${order.id}`,
          transactionDesc: "SiletoExpress Order Payment"
        })
      });

      const data = await res.json();
      if (data.success) {
        alert("M-PESA STK push sent to your phone. Please complete the payment.");
      } else {
        alert(`Payment error: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
      alert("Payment request failed.");
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold">Checkout</h1>

      <input
        type="text"
        placeholder="M-PESA Phone Number"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        className="border p-2 w-full my-3"
      />

      <button
        onClick={handleMpesaPayment}
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Processing..." : "Pay with M-PESA"}
      </button>
    </div>
  );
}

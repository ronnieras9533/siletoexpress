import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function Checkout() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCartTotal = async () => {
      const { data, error } = await supabase
        .from("cart")
        .select("price, quantity");

      if (error) {
        console.error("Error fetching cart:", error);
        return;
      }

      if (data) {
        const calculatedTotal = data.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        setTotal(calculatedTotal);
      }
    };

    fetchCartTotal();
  }, []);

  const createOrder = async () => {
    if (total <= 0) {
      alert("Order total must be greater than zero.");
      return null;
    }

    const { data, error } = await supabase
      .from("orders")
      .insert([{ total, status: "pending" }])
      .select()
      .single();

    if (error) {
      console.error("Error creating order:", error);
      alert("Failed to create order.");
      return null;
    }

    return data;
  };

  const handleMpesaPayment = async () => {
    if (!/^254\d{9}$/.test(phoneNumber)) {
      alert("Please enter a valid M-PESA phone number (e.g., 2547XXXXXXXX).");
      return;
    }

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
          transactionDesc: "SiletoExpress Order Payment",
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert("M-PESA STK push sent. Complete payment on your phone.");
      } else {
        alert(`Payment error: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Payment request failed:", err);
      alert("Payment request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Checkout</h1>
      <p className="mb-4 font-semibold">
        Total Amount: <span className="text-green-700">KES {total}</span>
      </p>
      <input
        type="text"
        placeholder="M-PESA Phone Number (e.g. 2547XXXXXXXX)"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        className="border p-2 w-full mb-4 rounded"
      />
      <button
        onClick={handleMpesaPayment}
        disabled={loading || total <= 0}
        className="bg-green-600 text-white px-4 py-2 rounded w-full disabled:bg-gray-400"
      >
        {loading ? "Processing..." : "Pay with M-PESA"}
      </button>
    </div>
  );
}

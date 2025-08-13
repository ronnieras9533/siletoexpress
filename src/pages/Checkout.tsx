import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function Checkout() {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [county, setCounty] = useState("");
  const [instructions, setInstructions] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch cart items and total
  useEffect(() => {
    const fetchCart = async () => {
      const { data, error } = await supabase.from("cart").select("id, name, price, quantity");
      if (error) {
        console.error("Error fetching cart:", error);
        return;
      }
      if (data) {
        setCartItems(data);
        const calculatedTotal = data.reduce((sum, item) => sum + item.price * item.quantity, 0);
        setTotal(calculatedTotal);
      }
    };
    fetchCart();
  }, []);

  const createOrder = async () => {
    if (total <= 0) {
      alert("Order total must be greater than zero.");
      return null;
    }
    if (!deliveryAddress || !county) {
      alert("Please fill in all delivery details.");
      return null;
    }
    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          total,
          status: "pending",
          address: deliveryAddress,
          county,
          instructions,
        },
      ])
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
    <>
      <Header />
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Checkout</h1>

        {/* Cart Summary */}
        <div className="bg-white shadow rounded p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Order Summary</h2>
          {cartItems.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            <ul className="divide-y">
              {cartItems.map((item) => (
                <li key={item.id} className="flex justify-between py-2">
                  <span>{item.name} × {item.quantity}</span>
                  <span>KES {item.price * item.quantity}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 font-bold text-lg">
            Total: <span className="text-green-700">KES {total}</span>
          </div>
        </div>

        {/* Delivery Details */}
        <div className="bg-white shadow rounded p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Delivery Details</h2>
          <input
            type="text"
            placeholder="Delivery Address"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            className="border p-2 w-full mb-3 rounded"
          />
          <input
            type="text"
            placeholder="County"
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            className="border p-2 w-full mb-3 rounded"
          />
          <textarea
            placeholder="Additional Delivery Instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="border p-2 w-full mb-3 rounded"
          />
        </div>

        {/* Payment */}
        <div className="bg-white shadow rounded p-4">
          <h2 className="text-lg font-semibold mb-3">Payment</h2>
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
      </div>
      <Footer />
    </>
  );
        }

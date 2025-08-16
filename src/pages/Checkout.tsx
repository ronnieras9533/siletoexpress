// src/pages/Checkout.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, clearCart, subtotal } = useCart();

  const [county, setCounty] = useState("");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const totalAmount = subtotal + deliveryFee;

  // --- Delivery Fee Calculation ---
  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const needsPrescription = items.some(item => item.prescription_required);
    setRequiresPrescription(needsPrescription);

    if (county) {
      calculateDeliveryFee();
    }
  }, [user, navigate, items, county]);

  const calculateDeliveryFee = () => {
    const neighboringCounties = ["Kiambu", "Machakos", "Kajiado"];
    let fee = 300; // default for other counties

    if (county === "Nairobi") {
      fee = 0; // Free for Nairobi
    } else if (neighboringCounties.includes(county)) {
      fee = 200; // Neighboring counties discounted rate
    }

    setDeliveryFee(fee);
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.from("orders").insert([
        {
          user_id: user.id,
          items,
          subtotal,
          delivery_fee: deliveryFee,
          total: totalAmount,
          county,
          order_type: requiresPrescription ? "prescription" : "regular",
          status: "pending",
          payment_status: "unpaid",
        },
      ]);

      if (error) throw error;

      clearCart();
      navigate("/orders");
    } catch (err) {
      console.error("Error placing order:", err);
      alert("Something went wrong while placing your order.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* County Selection */}
          <div>
            <label className="block mb-2 text-sm font-medium">Select County</label>
            <Select value={county} onValueChange={setCounty}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your county" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Nairobi">Nairobi</SelectItem>
                <SelectItem value="Kiambu">Kiambu</SelectItem>
                <SelectItem value="Machakos">Machakos</SelectItem>
                <SelectItem value="Kajiado">Kajiado</SelectItem>
                <SelectItem value="Mombasa">Mombasa</SelectItem>
                <SelectItem value="Nakuru">Nakuru</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Order Summary */}
          <div className="space-y-2">
            <p>Subtotal: <strong>KES {subtotal}</strong></p>
            <p>
              Delivery Fee:{" "}
              <strong>
                {deliveryFee === 0
                  ? "Free (Nairobi)"
                  : `KES ${deliveryFee}`}
              </strong>
            </p>
            <p>Total: <strong>KES {totalAmount}</strong></p>
          </div>

          {requiresPrescription && (
            <p className="text-red-500 text-sm">
              This order includes prescription-only items. Please ensure you have uploaded a valid prescription.
            </p>
          )}

          <Button
            onClick={handlePlaceOrder}
            disabled={isLoading || !county}
            className="w-full"
          >
            {isLoading ? "Placing Order..." : "Place Order"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Checkout;

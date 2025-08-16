// src/pages/Checkout.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const counties = [
  "Nairobi",
  "Kiambu",
  "Machakos",
  "Kajiado",
  "Mombasa",
  "Nakuru",
  "Kisumu",
  "Uasin Gishu",
  "Meru",
  "Eldoret",
  "Other",
];

const Checkout: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState<any[]>([]);
  const [county, setCounty] = useState("");
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [subtotal, setSubtotal] = useState<number>(0);

  useEffect(() => {
    const fetchCart = async () => {
      if (!user) return;
      const { data, error } = await supabase.from("cart").select("*").eq("user_id", user.id);
      if (error) {
        console.error("Error fetching cart:", error);
      } else {
        setCart(data || []);
        const total = (data || []).reduce(
          (sum: number, item: any) => sum + item.price * item.quantity,
          0
        );
        setSubtotal(total);
      }
    };
    fetchCart();
  }, [user]);

  useEffect(() => {
    if (county) {
      calculateDeliveryFee();
    }
  }, [county]);

  const calculateDeliveryFee = () => {
    const neighboringCounties = ["Kiambu", "Machakos", "Kajiado"];
    let fee = 300; // default
    if (county === "Nairobi") {
      fee = 0;
    } else if (neighboringCounties.includes(county)) {
      fee = 200;
    }
    setDeliveryFee(fee);
  };

  const total = subtotal + (deliveryFee || 0);

  const handlePlaceOrder = async () => {
    if (!user) {
      navigate("/login");
      return;
    }

    const { error } = await supabase.from("orders").insert([
      {
        user_id: user.id,
        items: cart,
        county,
        delivery_fee: deliveryFee,
        subtotal,
        total,
        status: "Pending",
      },
    ]);

    if (error) {
      console.error("Error placing order:", error);
    } else {
      await supabase.from("cart").delete().eq("user_id", user.id);
      navigate("/orders");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>Checkout</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* County Selector */}
            <div>
              <label className="block text-sm font-medium mb-1">Select County</label>
              <Select onValueChange={setCounty}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your county" />
                </SelectTrigger>
                <SelectContent>
                  {counties.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Order Summary */}
            <div className="text-sm">
              <p>
                Subtotal: <span className="font-semibold">KES {subtotal}</span>
              </p>
              <p>
                Delivery Fee:{" "}
                <span className="font-semibold">
                  {deliveryFee === 0
                    ? "Free (Nairobi)"
                    : `KES ${deliveryFee}`}
                </span>
              </p>
              {deliveryFee === 200 && (
                <p className="text-xs text-green-600">
                  Discounted delivery for neighboring counties!
                </p>
              )}
              <p>
                Total:{" "}
                <span className="font-bold">KES {isNaN(total) ? 0 : total}</span>
              </p>
            </div>

            {/* Place Order Button */}
            <Button
              className="w-full"
              onClick={handlePlaceOrder}
              disabled={!county}
            >
              Place Order
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Checkout;

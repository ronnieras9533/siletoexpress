import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminOrdersTable() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const markAsPaid = async (orderId: string) => {
    const { data, error } = await supabase
      .from("orders")
      .update({ payment_status: "paid" }) // Update payment_status, not order_status
      .eq("id", orderId);

    if (error) {
      console.error("Error marking order as paid:", error);
    } else {
      console.log("Order marked as paid:", data);
      fetchOrders(); // Refresh table
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { data, error } = await supabase
      .from("orders")
      .update({ status }) // Only allowed values: 'pending', 'confirmed', 'delivered'
      .eq("id", orderId);

    if (error) {
      console.error("Error updating order status:", error);
    } else {
      console.log("Order status updated:", data);
      fetchOrders();
    }
  };

  if (loading) return <p>Loading orders...</p>;

  return (
    <div>
      {orders.map((order) => (
        <Card key={order.id} className="mb-4">
          <CardHeader>
            <CardTitle>Order {order.id}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Total: {order.total_amount} {order.currency}</p>
            <p>Status: {order.status}</p>
            <p>Payment Status: {order.payment_status}</p>

            {order.payment_status !== "paid" && (
              <Button onClick={() => markAsPaid(order.id)}>Mark as Paid</Button>
            )}

            {["pending", "confirmed", "delivered"].map((s) => (
              <Button
                key={s}
                onClick={() => updateOrderStatus(order.id, s)}
                disabled={order.status === s}
                className="ml-2"
              >
                Set {s}
              </Button>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

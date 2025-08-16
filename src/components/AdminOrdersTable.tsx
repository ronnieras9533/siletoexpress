// src/components/ui/AdminOrdersTable.tsx

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Order {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  payment_status: string;
  requires_prescription: boolean;
}

interface Payment {
  id: string;
  order_id: string;
  status: string;
  amount: number;
  method: string;
}

const AdminOrdersTable: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [orderType, setOrderType] = useState<"all" | "regular" | "prescription">(
    "all"
  );

  useEffect(() => {
    fetchOrders();
    fetchPayments();
  }, [orderType]);

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase.from("orders").select("*");

    if (orderType === "regular") {
      query = query.or("requires_prescription.is.null,requires_prescription.eq.false");
    } else if (orderType === "prescription") {
      query = query.eq("requires_prescription", true);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) console.error("Error fetching orders:", error);
    else setOrders(data || []);
    setLoading(false);
  };

  const fetchPayments = async () => {
    const { data, error } = await supabase.from("payments").select("*");
    if (error) console.error("Error fetching payments:", error);
    else setPayments(data || []);
  };

  const handleMarkPaid = async (order: Order) => {
    // Update payments table
    const payment = payments.find((p) => p.order_id === order.id);
    if (payment) {
      const { error: paymentError } = await supabase
        .from("payments")
        .update({ status: "paid" })
        .eq("id", payment.id);

      if (paymentError) {
        console.error("Error updating payment:", paymentError);
        return;
      }
    }

    // Update orders table → status should NOT be "paid"
    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: "approved", payment_status: "paid" }) // ✅ fixed
      .eq("id", order.id);

    if (orderError) {
      console.error("Error updating order:", orderError);
      return;
    }

    fetchOrders();
    fetchPayments();
  };

  const getOrderPaymentStatus = (orderId: string) => {
    const payment = payments.find((p) => p.order_id === orderId);
    return payment ? payment.status : "pending";
  };

  return (
    <Card className="p-4">
      <CardContent>
        <h2 className="text-xl font-semibold mb-4">Orders Management</h2>

        <div className="flex gap-2 mb-4">
          <Button
            variant={orderType === "all" ? "default" : "outline"}
            onClick={() => setOrderType("all")}
          >
            All Orders
          </Button>
          <Button
            variant={orderType === "regular" ? "default" : "outline"}
            onClick={() => setOrderType("regular")}
          >
            Regular Orders
          </Button>
          <Button
            variant={orderType === "prescription" ? "default" : "outline"}
            onClick={() => setOrderType("prescription")}
          >
            Prescription Orders
          </Button>
        </div>

        {loading ? (
          <p>Loading orders...</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="border-b p-2">Order ID</th>
                <th className="border-b p-2">Total Amount</th>
                <th className="border-b p-2">Status</th>
                <th className="border-b p-2">Payment Status</th>
                <th className="border-b p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const paymentStatus = getOrderPaymentStatus(order.id);
                return (
                  <tr key={order.id}>
                    <td className="border-b p-2">{order.id}</td>
                    <td className="border-b p-2">KES {order.total_amount}</td>
                    <td className="border-b p-2">{order.status}</td>
                    <td className="border-b p-2">{paymentStatus}</td>
                    <td className="border-b p-2">
                      {paymentStatus !== "paid" && (
                        <Button onClick={() => handleMarkPaid(order)}>
                          Mark as Paid
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminOrdersTable;

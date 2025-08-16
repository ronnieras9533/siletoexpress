import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import PrescriptionViewer from "@/components/PrescriptionViewer";
import OrderTrackingStatusUpdate from "@/components/OrderTrackingStatusUpdate";

type Order = {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  created_at: string;
  requires_prescription: boolean;
  prescription_approved: boolean;
  payment_status: string;
};

export default function AdminOrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderType, setOrderType] = useState<"regular" | "prescription">("regular");

  useEffect(() => {
    fetchOrders();
  }, [orderType]);

  const fetchOrders = async () => {
    let query = supabase.from("orders").select("*");

    if (orderType === "regular") {
      query = query.or("requires_prescription.is.null,requires_prescription.eq.false");
    } else if (orderType === "prescription") {
      query = query.eq("requires_prescription", true);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) console.error("Error fetching orders:", error);
    else setOrders(data || []);
  };

  const handleMarkPaid = async (order: Order) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: "approved", payment_status: "paid" })
      .eq("id", order.id);

    if (error) console.error("Error updating order:", error);
    else fetchOrders();
  };

  return (
    <div className="p-4">
      {/* Tabs */}
      <div className="flex gap-4 mb-4">
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

      {/* Orders Table */}
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Order ID</th>
            <th className="p-2 border">User</th>
            <th className="p-2 border">Total</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Payment</th>
            <th className="p-2 border">Created</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b">
              <td className="p-2 border">{order.id}</td>
              <td className="p-2 border">{order.user_id}</td>
              <td className="p-2 border">KES {order.total_amount}</td>
              <td className="p-2 border">{order.status}</td>
              <td className="p-2 border">{order.payment_status}</td>
              <td className="p-2 border">
                {new Date(order.created_at).toLocaleString()}
              </td>
              <td className="p-2 border flex gap-2">
                {/* Mark Paid */}
                {order.payment_status === "pending" && (
                  <Button size="sm" onClick={() => handleMarkPaid(order)}>
                    Mark Paid
                  </Button>
                )}

                {/* View Prescription if needed */}
                {order.requires_prescription && (
                  <PrescriptionViewer orderId={order.id} />
                )}

                {/* Tracking / Update Status */}
                <OrderTrackingStatusUpdate order={order} onUpdate={fetchOrders} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

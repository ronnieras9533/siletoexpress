// src/components/AdminOrdersTable.tsx

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type Order = {
  id: string;
  total: number;
  status: string;
  payment_status: string;
  order_type: "regular" | "prescription";
  created_at: string;
  prescription_url?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address?: string;
};

export default function AdminOrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error);
    } else {
      setOrders(data as Order[]);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      console.error("Error updating status:", error);
    } else {
      fetchOrders();
    }
  };

  const markAsPaid = async (id: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("id", id);

    if (error) {
      console.error("Error marking paid:", error);
    } else {
      fetchOrders();
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">All Orders</h2>

      {loading ? (
        <p>Loading orders...</p>
      ) : (
        <table className="min-w-full border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Order</th>
              <th className="px-4 py-2 text-left">Total</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Payment</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Created</th>
              <th className="px-4 py-2 text-left">Prescription</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t">
                <td className="px-4 py-2">#{order.id.slice(0, 6)}</td>
                <td className="px-4 py-2">KES {order.total}</td>
                <td className="px-4 py-2">{order.status}</td>
                <td className="px-4 py-2">{order.payment_status}</td>
                <td className="px-4 py-2 capitalize">{order.order_type}</td>
                <td className="px-4 py-2">
                  {new Date(order.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  {order.order_type === "prescription" &&
                  order.prescription_url ? (
                    <a
                      href={order.prescription_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View Prescription
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-2 flex items-center gap-2">
                  {/* View button opens modal */}
                  <Button variant="outline" onClick={() => setSelectedOrder(order)}>
                    View
                  </Button>

                  {/* Tracking status dropdown */}
                  <select
                    value={order.status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    className="border rounded px-2 py-1"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="completed">Completed</option>
                  </select>

                  {/* Mark as Paid */}
                  {order.payment_status !== "paid" && (
                    <Button onClick={() => markAsPaid(order.id)}>Mark Paid</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal for viewing order details */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-2">
              <p>
                <strong>Order ID:</strong> #{selectedOrder.id}
              </p>
              <p>
                <strong>Total:</strong> KES {selectedOrder.total}
              </p>
              <p>
                <strong>Status:</strong> {selectedOrder.status}
              </p>
              <p>
                <strong>Payment:</strong> {selectedOrder.payment_status}
              </p>
              <p>
                <strong>Type:</strong> {selectedOrder.order_type}
              </p>
              <p>
                <strong>Created:</strong>{" "}
                {new Date(selectedOrder.created_at).toLocaleString()}
              </p>
              {selectedOrder.customer_name && (
                <p>
                  <strong>Customer:</strong> {selectedOrder.customer_name} (
                  {selectedOrder.customer_email}, {selectedOrder.customer_phone})
                </p>
              )}
              {selectedOrder.shipping_address && (
                <p>
                  <strong>Shipping Address:</strong>{" "}
                  {selectedOrder.shipping_address}
                </p>
              )}
              {selectedOrder.order_type === "prescription" &&
                selectedOrder.prescription_url && (
                  <p>
                    <strong>Prescription:</strong>{" "}
                    <a
                      href={selectedOrder.prescription_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                    >
                      View Prescription
                    </a>
                  </p>
                )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setSelectedOrder(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

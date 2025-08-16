// src/components/ui/AdminOrdersTable.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PrescriptionViewer from "@/components/ui/PrescriptionViewer";

interface Order {
  id: string;
  user_id: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  requires_prescription: boolean;
  prescription_url?: string;
}

const AdminOrdersTable: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching orders:", error);
    else setOrders(data || []);
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      console.error("Error updating order status:", error);
      return;
    }
    fetchOrders();
  };

  const updatePaymentStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: newStatus })
      .eq("id", orderId);

    if (error) {
      console.error("Error updating payment status:", error);
      return;
    }
    fetchOrders();
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">All Orders</h2>
      {loading ? (
        <p>Loading orders...</p>
      ) : (
        <table className="w-full border-collapse border rounded-lg shadow-md">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">ID</th>
              <th className="border p-2">Created At</th>
              <th className="border p-2">Amount (KES)</th>
              <th className="border p-2">Order Type</th>
              <th className="border p-2">Order Status</th>
              <th className="border p-2">Payment Status</th>
              <th className="border p-2">Prescription</th>
              <th className="border p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="text-center">
                <td className="border p-2">{order.id}</td>
                <td className="border p-2">
                  {new Date(order.created_at).toLocaleString()}
                </td>
                <td className="border p-2">{order.total_amount}</td>
                <td className="border p-2">
                  {order.requires_prescription ? "Prescription Order" : "Regular Order"}
                </td>
                <td className="border p-2">
                  <Select
                    onValueChange={(value) => updateOrderStatus(order.id, value)}
                    defaultValue={order.status}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="border p-2">
                  <Select
                    onValueChange={(value) => updatePaymentStatus(order.id, value)}
                    defaultValue={order.payment_status}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="border p-2">
                  {order.requires_prescription ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">View Prescription</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Prescription</DialogTitle>
                        </DialogHeader>
                        <PrescriptionViewer orderId={order.id} />
                      </DialogContent>
                    </Dialog>
                  ) : (
                    "N/A"
                  )}
                </td>
                <td className="border p-2">
                  <Button
                    variant="secondary"
                    onClick={() => fetchOrders()}
                  >
                    Refresh
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminOrdersTable;

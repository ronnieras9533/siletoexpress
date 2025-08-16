import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Order = {
  id: string;
  user_id: string;
  status: string;             // enum order_status
  payment_status: string;     // "pending" | "paid" | "failed"
  total_amount: number;
  currency: string | null;
  created_at: string;
  requires_prescription: boolean | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  quantity: number;
  price: number;
  products: {
    name: string;
    image_url?: string | null;
  };
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
};

const VALID_ORDER_STATUSES = ["pending", "confirmed", "delivered"] as const;
// Keep it tight to avoid enum errors.

export default function AdminOrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  // modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [customer, setCustomer] = useState<Profile | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    // REGULAR orders only: requires_prescription = false OR null
    let query = supabase
      .from("orders")
      .select("*")
      .or("requires_prescription.is.null,requires_prescription.eq.false")
      .order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching regular orders:", error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const openOrderDetails = async (order: Order) => {
    setSelectedOrder(order);

    // Items + product info
    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select("id, order_id, quantity, price, products(name, image_url)")
      .eq("order_id", order.id);
    if (itemsErr) console.error("Error fetching order_items:", itemsErr);
    setOrderItems(items || []);

    // Customer profile
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", order.user_id)
      .single();
    if (profErr) console.error("Error fetching profile:", profErr);
    setCustomer(profile || null);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    // Protect against undefined IDs and invalid enum values.
    if (!orderId) return console.error("No orderId passed to handleStatusUpdate");
    if (!VALID_ORDER_STATUSES.includes(newStatus as any)) {
      console.error("Invalid enum for order_status:", newStatus);
      return;
    }

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      console.error("Error updating status:", error);
      return;
    }
    await fetchOrders();
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  const handleMarkPaid = async (order: Order) => {
    if (!order?.id) return;

    // Only update payment_status here. Do NOT set status="paid".
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("id", order.id);

    if (error) {
      console.error("Error updating payment_status:", error);
      return;
    }
    await fetchOrders();
    if (selectedOrder && selectedOrder.id === order.id) {
      setSelectedOrder({ ...selectedOrder, payment_status: "paid" });
    }
  };

  return (
    <Card className="p-4">
      <CardContent>
        <h2 className="text-xl font-semibold mb-4">Regular Orders</h2>

        {loading ? (
          <p>Loading…</p>
        ) : orders.length === 0 ? (
          <p>No regular orders found.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="border-b p-2">Order</th>
                <th className="border-b p-2">Total</th>
                <th className="border-b p-2">Status</th>
                <th className="border-b p-2">Payment</th>
                <th className="border-b p-2">Created</th>
                <th className="border-b p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="border-b p-2">#{o.id.slice(-8)}</td>
                  <td className="border-b p-2">
                    {o.currency || "KES"} {Number(o.total_amount).toLocaleString()}
                  </td>
                  <td className="border-b p-2 capitalize">{o.status.replace(/_/g, " ")}</td>
                  <td className="border-b p-2 capitalize">{o.payment_status}</td>
                  <td className="border-b p-2">
                    {new Date(o.created_at).toLocaleString()}
                  </td>
                  <td className="border-b p-2">
                    <div className="flex gap-2 items-center">
                      <Button size="sm" variant="outline" onClick={() => openOrderDetails(o)}>
                        View
                      </Button>
                      <Select
                        defaultValue={o.status}
                        onValueChange={(val) => handleStatusUpdate(o.id, val)}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Update status" />
                        </SelectTrigger>
                        <SelectContent>
                          {VALID_ORDER_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {o.payment_status !== "paid" && (
                        <Button size="sm" onClick={() => handleMarkPaid(o)}>
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Details Modal */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Order Details {selectedOrder ? `#${selectedOrder.id.slice(-8)}` : ""}
              </DialogTitle>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Status:</strong> {selectedOrder.status}</p>
                    <p><strong>Payment:</strong> {selectedOrder.payment_status}</p>
                    <p>
                      <strong>Total:</strong> {selectedOrder.currency || "KES"}{" "}
                      {Number(selectedOrder.total_amount).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p><strong>Created:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                    <p>
                      <strong>Prescription Required:</strong>{" "}
                      {selectedOrder.requires_prescription ? "Yes" : "No"}
                    </p>
                  </div>
                </div>

                {customer && (
                  <div className="border-t pt-3">
                    <h3 className="font-semibold mb-2">Customer</h3>
                    <p>{customer.full_name || "Unknown"}</p>
                    <p className="text-sm text-gray-600">{customer.email || ""}</p>
                  </div>
                )}

                {orderItems.length > 0 && (
                  <div className="border-t pt-3">
                    <h3 className="font-semibold mb-2">Items</h3>
                    <ul className="space-y-2">
                      {orderItems.map((it) => (
                        <li key={it.id} className="flex items-center gap-3">
                          {it.products?.image_url ? (
                            <img
                              src={it.products.image_url}
                              alt={it.products.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                          ) : null}
                          <div>
                            <div className="font-medium">{it.products?.name}</div>
                            <div className="text-sm text-gray-600">
                              Qty: {it.quantity} • Price: {selectedOrder.currency || "KES"}{" "}
                              {Number(it.price).toLocaleString()}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

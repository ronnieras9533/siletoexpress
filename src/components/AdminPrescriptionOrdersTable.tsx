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
  status: string;                  // enum order_status
  payment_status: string;          // "pending" | "paid" | "failed"
  total_amount: number;
  currency: string | null;
  created_at: string;
  requires_prescription: boolean;
  prescription_approved: boolean | null;
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

type Prescription = {
  id: string;
  image_url: string;               // matches your schema sample
  status: string;                  // "pending" | "approved" | "rejected" ?
  admin_notes: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone?: string | null;
};

const VALID_ORDER_STATUSES = ["pending", "confirmed", "delivered"] as const;

export default function AdminPrescriptionOrdersTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  // modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [customer, setCustomer] = useState<Profile | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("requires_prescription", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching prescription orders:", error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const openOrderDetails = async (order: Order) => {
    setSelectedOrder(order);

    const { data: items, error: itemsErr } = await supabase
      .from("order_items")
      .select("id, order_id, quantity, price, products(name, image_url)")
      .eq("order_id", order.id);
    if (itemsErr) console.error("Error fetching order_items:", itemsErr);
    setOrderItems(items || []);

    const { data: presc, error: prescErr } = await supabase
      .from("prescriptions")
      .select("id, image_url, status, admin_notes, created_at")
      .eq("order_id", order.id);
    if (prescErr) console.error("Error fetching prescriptions:", prescErr);
    setPrescriptions(presc || []);

    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("id", order.user_id)
      .single();
    if (profErr) console.error("Error fetching profile:", profErr);
    setCustomer(profile || null);
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
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

  const approvePrescription = async (order: Order) => {
    // 1) update orders.prescription_approved = true
    const { error: oErr } = await supabase
      .from("orders")
      .update({ prescription_approved: true })
      .eq("id", order.id);
    if (oErr) {
      console.error("Error approving on orders:", oErr);
    }

    // 2) update prescriptions.status = "approved" for this order
    const { error: pErr } = await supabase
      .from("prescriptions")
      .update({ status: "approved" })
      .eq("order_id", order.id);
    if (pErr) {
      console.error("Error updating prescriptions:", pErr);
    }

    await fetchOrders();
    if (selectedOrder && selectedOrder.id === order.id) {
      setSelectedOrder({ ...selectedOrder, prescription_approved: true });
      // refresh prescriptions list in modal
      openOrderDetails(selectedOrder);
    }
  };

  const rejectPrescription = async (order: Order) => {
    const { error: oErr } = await supabase
      .from("orders")
      .update({ prescription_approved: false })
      .eq("id", order.id);
    if (oErr) {
      console.error("Error rejecting on orders:", oErr);
    }

    const { error: pErr } = await supabase
      .from("prescriptions")
      .update({ status: "rejected" })
      .eq("order_id", order.id);
    if (pErr) {
      console.error("Error updating prescriptions:", pErr);
    }

    await fetchOrders();
    if (selectedOrder && selectedOrder.id === order.id) {
      setSelectedOrder({ ...selectedOrder, prescription_approved: false });
      openOrderDetails(selectedOrder);
    }
  };

  return (
    <Card className="p-4">
      <CardContent>
        <h2 className="text-xl font-semibold mb-4">Prescription Orders</h2>

        {loading ? (
          <p>Loading…</p>
        ) : orders.length === 0 ? (
          <p>No prescription orders found.</p>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="border-b p-2">Order</th>
                <th className="border-b p-2">Total</th>
                <th className="border-b p-2">Status</th>
                <th className="border-b p-2">Payment</th>
                <th className="border-b p-2">Prescription</th>
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
                    {o.prescription_approved ? (
                      <span className="text-green-700">Approved</span>
                    ) : (
                      <span className="text-yellow-700">Pending</span>
                    )}
                  </td>
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

        {/* Details Modal (with prescriptions) */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Prescription Order {selectedOrder ? `#${selectedOrder.id.slice(-8)}` : ""}
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
                      <strong>Prescription Approved:</strong>{" "}
                      {selectedOrder.prescription_approved ? "Yes" : "No"}
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

                <div className="border-t pt-3">
                  <h3 className="font-semibold mb-2">Prescription(s)</h3>
                  {prescriptions.length === 0 ? (
                    <p className="text-sm text-gray-600">No prescription files uploaded.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {prescriptions.map((p) => (
                        <div key={p.id} className="space-y-2">
                          <a
                            href={p.image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={p.image_url}
                              alt={`Prescription ${p.id}`}
                              className="w-full h-32 object-cover rounded"
                            />
                          </a>
                          <div className="text-xs text-gray-600">Status: {p.status}</div>
                          {p.admin_notes && (
                            <div className="text-xs text-gray-600">Notes: {p.admin_notes}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => approvePrescription(selectedOrder)}
                    >
                      Approve Prescription
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectPrescription(selectedOrder)}
                    >
                      Reject Prescription
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

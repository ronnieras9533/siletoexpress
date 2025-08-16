// src/components/ui/AdminOrdersTable.tsx

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  product?: {
    name: string;
    image_url?: string;
  };
}

interface Prescription {
  id: string;
  order_id: string;
  file_url: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
}

const AdminOrdersTable: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [orderType, setOrderType] = useState<"all" | "regular" | "prescription">("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [customer, setCustomer] = useState<Profile | null>(null);

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

    const { error: orderError } = await supabase
      .from("orders")
      .update({ status: "approved", payment_status: "paid" })
      .eq("id", order.id);

    if (orderError) {
      console.error("Error updating order:", orderError);
      return;
    }

    fetchOrders();
    fetchPayments();
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
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

  const getOrderPaymentStatus = (orderId: string) => {
    const payment = payments.find((p) => p.order_id === orderId);
    return payment ? payment.status : "pending";
  };

  const fetchOrderDetails = async (order: Order) => {
    setSelectedOrder(order);

    // Fetch order items + product info
    const { data: items, error: itemsError } = await supabase
      .from("order_items")
      .select("id, order_id, product_id, quantity, price, products(name, image_url)")
      .eq("order_id", order.id);

    if (itemsError) console.error("Error fetching order items:", itemsError);
    else setOrderItems(items || []);

    // Fetch prescriptions
    const { data: presc, error: prescError } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("order_id", order.id);

    if (prescError) console.error("Error fetching prescriptions:", prescError);
    else setPrescriptions(presc || []);

    // Fetch customer profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, email, phone")
      .eq("id", order.user_id)
      .single();

    if (profileError) console.error("Error fetching profile:", profileError);
    else setCustomer(profile);
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
                <th className="border-b p-2">Actions</th>
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
                    <td className="border-b p-2 flex gap-2">
                      <Button variant="outline" onClick={() => fetchOrderDetails(order)}>
                        View
                      </Button>
                      <Select
                        onValueChange={(value) => handleStatusUpdate(order.id, value)}
                        defaultValue={order.status}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Update Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      {paymentStatus !== "paid" && (
                        <Button onClick={() => handleMarkPaid(order)}>Mark Paid</Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Order Details Modal */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                <p><strong>Order ID:</strong> {selectedOrder.id}</p>
                <p><strong>Total Amount:</strong> KES {selectedOrder.total_amount}</p>
                <p><strong>Status:</strong> {selectedOrder.status}</p>
                <p><strong>Payment Status:</strong> {getOrderPaymentStatus(selectedOrder.id)}</p>
                <p><strong>Created At:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>

                {customer && (
                  <div className="border-t pt-2">
                    <h3 className="font-semibold">Customer Info</h3>
                    <p>{customer.name}</p>
                    <p>{customer.email}</p>
                    <p>{customer.phone}</p>
                  </div>
                )}

                {orderItems.length > 0 && (
                  <div className="border-t pt-2">
                    <h3 className="font-semibold">Products</h3>
                    <ul className="space-y-2">
                      {orderItems.map((item) => (
                        <li key={item.id} className="flex items-center gap-3">
                          {item.product?.image_url && (
                            <img
                              src={item.product.image_url}
                              alt={item.product.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                          )}
                          <div>
                            <p>{item.product?.name}</p>
                            <p className="text-sm text-gray-500">
                              Qty: {item.quantity} | Price: KES {item.price}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {prescriptions.length > 0 && (
                  <div className="border-t pt-2">
                    <h3 className="font-semibold">Prescription</h3>
                    <ul className="space-y-2">
                      {prescriptions.map((presc) => (
                        <li key={presc.id}>
                          <a
                            href={presc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            View Prescription
                          </a>
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
};

export default AdminOrdersTable;

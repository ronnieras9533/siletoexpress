import { createClient } from "@supabase/supabase-js";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(JSON.stringify({ error: "Missing orderId" }), { status: 400 });
    }

    // Fetch order to confirm payment was received
    const { data: order, error: fetchError } = await supabase
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });
    }

    if (order.status !== "payment_received") {
      return new Response(
        JSON.stringify({ error: "Payment not yet received" }),
        { status: 400 }
      );
    }

    // Update order as fully paid/confirmed
    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: "confirmed" })
      .eq("id", orderId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
    }

    // Trigger notification function
    await supabase.functions.invoke("order-status-notification", {
      body: { orderId, newStatus: "confirmed" },
    });

    return new Response(JSON.stringify({ status: "success" }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

// supabase/functions/pesapal-payment/index.ts

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);

serve(async (req) => {
  try {
    const { order_id } = await req.json();

    if (!order_id) {
      return new Response(JSON.stringify({ error: "Missing order_id" }), { status: 400 });
    }

    // Fetch order details from your orders table
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404 });
    }

    const consumer = {
      first_name: "Customer",
      last_name: "User",
      email_address: order.email || "test@example.com",
      phone_number: order.phone || "+254712345678",
      country_code: "KE"
    };

    // Get IPN ID from env
    const ipnId = Deno.env.get("PESAPAL_IPN_ID");
    if (!ipnId) {
      return new Response(JSON.stringify({ error: "Missing PESAPAL_IPN_ID env variable" }), { status: 500 });
    }

    const callback_url = `${Deno.env.get("PESAPAL_CALLBACK_URL")}/order/${order_id}/status`;

    // Get access token
    const tokenResponse = await fetch("https://pay.pesapal.com/v3/api/Auth/RequestToken", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PESAPAL_API_TOKEN")}`,
        "Content-Type": "application/json"
      }
    });

    const tokenData = await tokenResponse.json();
    const token = tokenData.token;

    if (!token) {
      return new Response(JSON.stringify({ error: "Failed to get access token" }), { status: 500 });
    }

    // Create payment
    const paymentPayload = {
      id: order.id,
      currency: "KES",
      amount: order.amount,
      description: "Order payment",
      callback_url,
      notification_id: ipnId,
      billing_address: {
        email_address: consumer.email_address,
        phone_number: consumer.phone_number,
        country_code: "KE",
        first_name: consumer.first_name,
        last_name: consumer.last_name,
        line_1: "Address Line 1",
        city: "Nairobi",
        state: "Nairobi",
        postal_code: "00100",
        zip_code: "00100"
      }
    };

    const pesapalRes = await fetch("https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(paymentPayload)
    });

    const paymentData = await pesapalRes.json();

    if (!pesapalRes.ok) {
      return new Response(JSON.stringify({ error: paymentData.message || "Pesapal error" }), { status: 500 });
    }

    return new Response(JSON.stringify({ status: "success", paymentData }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Unexpected error" }), { status: 500 });
  }
});

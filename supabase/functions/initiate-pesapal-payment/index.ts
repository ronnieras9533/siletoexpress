import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  orderId: string;
  amount: number;
  currency: string;
  email: string;
  phone: string;
  description: string;
  callback_url: string;
  notification_id: string;
  cartItems: any[];
  deliveryInfo: any;
  prescriptionId?: string;
}

serve(async (req) => {
  console.log("Pesapal payment initiation function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paymentData: PaymentRequest = await req.json();
    console.log("Payment data received:", paymentData);

    // Supabase service role client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user_id from the order record in Supabase
    const { data: orderRecord, error: orderError } = await supabaseClient
      .from("orders")
      .select("user_id")
      .eq("id", paymentData.orderId)
      .single();

    if (orderError || !orderRecord) {
      console.error("Order not found or error fetching order:", orderError);
      throw new Error("Order not found in database");
    }

    const consumerKey = Deno.env.get("PESAPAL_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("PESAPAL_CONSUMER_SECRET");

    if (!consumerKey || !consumerSecret) {
      throw new Error("Pesapal credentials not configured");
    }

    // Step 1: Get OAuth token
    console.log("Requesting OAuth token from Pesapal...");
    const tokenResponse = await fetch(
      "https://pay.pesapal.com/v3/api/Auth/RequestToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          consumer_key: consumerKey,
          consumer_secret: consumerSecret,
        }),
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token request failed:", errorText);
      throw new Error(`Failed to get OAuth token: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    console.log("OAuth token received successfully");

    // Step 2: Submit order request to Pesapal
    console.log("Submitting order request to Pesapal...");
    const orderRequest = {
      id: paymentData.orderId, // Link Pesapal transaction to our Supabase order ID
      currency: paymentData.currency,
      amount: paymentData.amount,
      description: paymentData.description,
      callback_url: paymentData.callback_url,
      notification_id: paymentData.notification_id,
      billing_address: {
        email_address: paymentData.email,
        phone_number: paymentData.phone,
        country_code: "KE",
        first_name: paymentData.email.split("@")[0],
        last_name: "Customer",
      },
    };

    const orderResponse = await fetch(
      "https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${tokenData.token}`,
        },
        body: JSON.stringify(orderRequest),
      }
    );

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error("Order submission failed:", errorText);
      throw new Error(`Failed to submit order: ${orderResponse.status}`);
    }

    const orderData = await orderResponse.json();
    console.log("Order submitted successfully:", orderData);

    // Step 3: Store payment record in Supabase
    const { error: paymentError } = await supabaseClient.from("payments").insert({
      order_id: paymentData.orderId, // NEW: store order ID for matching
      user_id: orderRecord.user_id, // from order query
      amount: paymentData.amount,
      currency: paymentData.currency,
      method: "pesapal_card",
      gateway: "pesapal",
      status: "pending",
      transaction_id: orderData.order_tracking_id,
      pesapal_tracking_id: orderData.order_tracking_id,
      metadata: {
        cart_items: paymentData.cartItems,
        delivery_info: paymentData.deliveryInfo,
        prescription_id: paymentData.prescriptionId,
        merchant_reference: orderData.merchant_reference,
        redirect_url: orderData.redirect_url,
      },
    });

    if (paymentError) {
      console.error("Failed to store payment record:", paymentError);
      throw new Error("Failed to store payment record in database");
    }

    console.log("Payment record stored successfully");

    return new Response(
      JSON.stringify({
        success: true,
        redirect_url: orderData.redirect_url,
        order_tracking_id: orderData.order_tracking_id,
        merchant_reference: orderData.merchant_reference,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Pesapal payment initiation error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

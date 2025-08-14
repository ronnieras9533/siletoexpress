import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Input validation
const validateKenyanPhone = (phone: string): boolean =>
  /^254[17]\d{8}$/.test(phone);
const validateAmount = (amount: number): boolean =>
  Number.isFinite(amount) && amount > 0 && amount <= 150000;
const sanitizeInput = (input: string): string =>
  input.replace(/[<>\"'&]/g, "").trim();

serve(async (req) => {
  console.log("M-PESA STK push function called:", req.method);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Read and parse JSON body safely
    let bodyText: string;
    try {
      bodyText = await req.text();
    } catch (err) {
      console.error("Failed to read request body:", err);
      return jsonError("Failed to read request body", 400);
    }

    let data: any;
    try {
      data = JSON.parse(bodyText);
    } catch (err) {
      console.error("Invalid JSON:", err);
      return jsonError("Invalid JSON in request body", 400);
    }

    const { orderId, amount, currency, phone, description, cartItems, deliveryInfo, prescriptionId } = data;

    // Validate input
    if (!orderId || typeof orderId !== "string" || orderId.length > 50) {
      return jsonError("Invalid order ID", 400);
    }
    if (!validateAmount(amount)) {
      return jsonError("Invalid amount", 400);
    }
    if (currency !== "KES") {
      return jsonError("Only KES currency supported", 400);
    }
    if (!validateKenyanPhone(phone)) {
      return jsonError("Invalid Kenyan phone number format", 400);
    }

    // Sanitize
    const sanitizedOrderId = sanitizeInput(orderId);
    const sanitizedPhone = sanitizeInput(phone);
    const sanitizedDescription = sanitizeInput(description || `Payment for order ${sanitizedOrderId}`);

    // Get M-PESA credentials
    const shortcode = Deno.env.get("MPESA_SHORTCODE");
    const passkey = Deno.env.get("MPESA_PASSKEY");
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");

    if (!shortcode || !passkey || !consumerKey || !consumerSecret) {
      return jsonError("Payment service configuration error", 500);
    }

    // Get access token
    const authResponse = await fetch(
      "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: "Basic " + btoa(`${consumerKey}:${consumerSecret}`),
        },
      }
    );

    if (!authResponse.ok) {
      return jsonError("Failed to authenticate with M-PESA", 500);
    }

    const { access_token } = await authResponse.json();

    // Prepare STK push payload
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: sanitizedPhone,
      PartyB: shortcode,
      PhoneNumber: sanitizedPhone,
      CallBackURL: `${Deno.env.get("BASE_URL")}/functions/v1/mpesa-callback`,
      AccountReference: sanitizedOrderId,
      TransactionDesc: sanitizedDescription,
    };

    // Send STK push request
    const stkResponse = await fetch(
      "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stkPayload),
      }
    );

    if (!stkResponse.ok) {
      const errorText = await stkResponse.text();
      return jsonError(`Failed to initiate payment: ${errorText}`, 500);
    }

    const stkResult = await stkResponse.json();

    // Store payment record in Supabase
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabaseClient.from("payments").insert({
      user_id: sanitizedOrderId,
      amount: amount,
      currency: currency,
      status: "pending",
      payment_method: "mpesa",
      mpesa_checkout_request_id: stkResult.CheckoutRequestID,
      metadata: {
        cart_items: cartItems || [],
        delivery_info: deliveryInfo || {},
        prescription_id: prescriptionId,
        phone: sanitizedPhone,
      },
    });

    return jsonSuccess("Payment initiated successfully", {
      checkout_request_id: stkResult.CheckoutRequestID,
      merchant_request_id: stkResult.MerchantRequestID,
    });

  } catch (err) {
    console.error("Unexpected error in M-PESA function:", err);
    return jsonError("Internal server error", 500, err.message);
  }
});

// Helper functions
function jsonError(message: string, status = 400, details?: string) {
  return new Response(
    JSON.stringify({ success: false, message, details }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

function jsonSuccess(message: string, data: any) {
  return new Response(
    JSON.stringify({ success: true, message, data }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

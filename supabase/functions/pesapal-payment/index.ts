// supabase/functions/pesapal-payment.ts

import { getAccessToken, createPesapalPaymentOrder } from "../_shared/pesapal.ts";

const allowedOrigin = "https://siletoexpress.com";

Deno.serve(async (req) => {
  const { method } = req;

  // ✅ Handle CORS preflight
  if (method === "OPTIONS") {
    return new Response("OK", {
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    const body = await req.json();

    if (!body.orderId || !body.amount || !body.currency || !body.email || !body.phone) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": allowedOrigin,
        },
      });
    }

    // 🔐 Get access token from Pesapal
    const tokenRes = await getAccessToken();
    if (!tokenRes || !tokenRes.token) {
      throw new Error("Pesapal token fetch failed");
    }

    // 🧾 Create payment order
    const orderRes = await createPesapalPaymentOrder({
      orderId: body.orderId,
      amount: body.amount,
      currency: body.currency,
      email: body.email,
      phone: body.phone,
      token: tokenRes.token,
    });

    return new Response(JSON.stringify(orderRes), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin,
      },
    });
  } catch (err) {
    console.error("Pesapal payment error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin,
      },
    });
  }
});

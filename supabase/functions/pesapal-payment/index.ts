import { getAccessToken, createPesapalPaymentOrder } from "../_shared/pesapal.ts";

const allowedOrigin = "https://siletoexpress.com";

Deno.serve(async (req) => {
  const { method } = req;

  // ✅ Handle preflight request
  if (method === "OPTIONS") {
    return new Response("OK", {
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const body = await req.json();

    // Get token
    const tokenRes = await getAccessToken();
    if (!tokenRes || !tokenRes.token) {
      throw new Error("Token fetch failed");
    }

    // Create order
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
    console.error("Edge Function Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": allowedOrigin,
      },
    });
  }
});

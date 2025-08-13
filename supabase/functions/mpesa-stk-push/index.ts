import { serve } from "https://deno.land/std@0.182.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { phoneNumber, amount, orderId, accountReference, transactionDesc } = await req.json();

    // Validate inputs
    if (!phoneNumber || !amount || !orderId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required payment information" }),
        { status: 400 }
      );
    }

    // Call M-PESA STK Push API (replace with your credentials)
    const mpesaRes = await fetch("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("MPESA_ACCESS_TOKEN")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: Deno.env.get("MPESA_SHORTCODE"),
        Password: Deno.env.get("MPESA_PASSWORD"),
        Timestamp: new Date().toISOString().replace(/\D/g, "").slice(0, 14),
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: Deno.env.get("MPESA_SHORTCODE"),
        PhoneNumber: phoneNumber,
        CallBackURL: `${Deno.env.get("SITE_URL")}/.netlify/functions/mpesa-callback`,
        AccountReference: accountReference || `Order-${orderId}`,
        TransactionDesc: transactionDesc || "Payment for order",
      }),
    });

    const data = await mpesaRes.json();
    console.log("M-PESA Response:", data);

    return new Response(JSON.stringify({ success: true, data }), { status: 200 });
  } catch (error) {
    console.error("Error in STK push:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }
});          responseDescription: stkResult.ResponseDescription
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      throw new Error(stkResult.errorMessage || stkResult.ResponseDescription || 'STK Push failed');
    }

  } catch (error) {
    console.error('M-PESA STK Push error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Payment processing failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

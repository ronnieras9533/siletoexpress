import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const { phoneNumber, amount, orderId, accountReference, transactionDesc } = await req.json();

    if (!phoneNumber || !amount || !orderId || !accountReference || !transactionDesc) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required payment information" }),
        { headers: { "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Safaricom M-PESA API credentials from environment
    const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortCode = Deno.env.get("MPESA_SHORTCODE");
    const passkey = Deno.env.get("MPESA_PASSKEY");
    const callbackURL = Deno.env.get("MPESA_CALLBACK_URL");

    // Get OAuth token
    const tokenRes = await fetch(
      `https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: "Basic " + btoa(`${consumerKey}:${consumerSecret}`)
        }
      }
    );

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Prepare STK push request
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14);

    const password = btoa(`${shortCode}${passkey}${timestamp}`);

    const stkRes = await fetch(`https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: phoneNumber,
        PartyB: shortCode,
        PhoneNumber: phoneNumber,
        CallBackURL: `${callbackURL}?orderId=${orderId}`,
        AccountReference: accountReference,
        TransactionDesc: transactionDesc
      })
    });

    const stkData = await stkRes.json();

    return new Response(JSON.stringify({ success: true, data: stkData }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }
});        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPushData)
    });

    const stkResult = await stkResponse.json();
    console.log('STK Push response:', stkResult);

    if (stkResult.ResponseCode === '0') {
      // Store payment record for tracking with proper user context
      const authHeader = req.headers.get('Authorization');
      let userId = null;

      if (authHeader?.startsWith('Bearer ')) {
        try {
          const token = authHeader.slice(7);
          const { data: { user } } = await supabaseClient.auth.getUser(token);
          userId = user?.id;
        } catch (error) {
          console.error('Error getting user from token:', error);
        }
      }

      const { error: paymentError } = await supabaseClient
        .from('payments')
        .insert({
          user_id: userId,
          amount: amount,
          currency: 'KES',
          method: 'mpesa',
          gateway: 'mpesa',
          status: 'pending',
          transaction_id: stkResult.CheckoutRequestID,
          metadata: {
            ...stkResult,
            phone_number: formattedPhone,
            order_reference: orderId,
            account_reference: accountReference
          }
        });

      if (paymentError) {
        console.error('Error storing payment record:', paymentError);
      } else {
        console.log('Payment record stored successfully');
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: stkResult.CustomerMessage || 'STK Push sent successfully',
          checkoutRequestID: stkResult.CheckoutRequestID,
          merchantRequestID: stkResult.MerchantRequestID,
          responseCode: stkResult.ResponseCode,
          responseDescription: stkResult.ResponseDescription
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

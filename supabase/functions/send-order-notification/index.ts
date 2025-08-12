
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationData {
  order_id: string;
  email: string;
  name: string;
  status: string;
  phone_number?: string;
  total_amount?: number;
}

serve(async (req) => {
  console.log("🚀 Send order notification function started");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("✅ Supabase client initialized");

    // Get unprocessed webhooks
    const { data: webhooks, error: fetchError } = await supabaseAdmin
      .from('pending_webhooks')
      .select('*')
      .eq('processed', false)
      .limit(10);

    if (fetchError) {
      console.error("❌ Error fetching webhooks:", fetchError);
      throw fetchError;
    }

    console.log(`📦 Found ${webhooks?.length || 0} unprocessed webhooks`);

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending notifications" }),
        { 
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const results = [];

    for (const webhook of webhooks) {
      console.log(`🔄 Processing webhook for order: ${webhook.order_id}`);
      
      try {
        // Get order details
        const { data: order, error: orderError } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('id', webhook.order_id)
          .single();

        if (orderError || !order) {
          console.error("❌ Error fetching order:", orderError);
          continue;
        }

        // Send email notification using Brevo
        await sendBrevoEmail({
          email: order.email || webhook.email,
          name: webhook.name || 'Customer',
          order_id: webhook.order_id,
          status: webhook.status,
          total_amount: order.total_amount,
        });

        // Send SMS if phone number is available
        if (order.phone_number) {
          await sendSMS({
            phone: order.phone_number,
            order_id: webhook.order_id,
            status: webhook.status,
          });
        }

        // Mark webhook as processed
        const { error: updateError } = await supabaseAdmin
          .from('pending_webhooks')
          .update({ processed: true })
          .eq('id', webhook.id);

        if (updateError) {
          console.error("❌ Error updating webhook status:", updateError);
        }

        results.push({ 
          order_id: webhook.order_id, 
          status: 'success',
          email_sent: true,
          sms_sent: !!order.phone_number 
        });

        console.log(`✅ Successfully processed order: ${webhook.order_id}`);

      } catch (error) {
        console.error(`❌ Error processing webhook ${webhook.id}:`, error);
        results.push({ 
          order_id: webhook.order_id, 
          status: 'error', 
          error: error.message 
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        processed: results.length,
        results 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    console.error("❌ Function error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

async function sendBrevoEmail(data: NotificationData) {
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  if (!brevoApiKey) {
    console.error("❌ BREVO_API_KEY not configured");
    throw new Error("Brevo API key not configured");
  }

  const subject = data.status === "confirmed"
    ? `Order #${data.order_id} Confirmed - SiletoExpress`
    : `Order #${data.order_id} Delivered - SiletoExpress`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Hello ${data.name},</h2>
      <p>Your order <strong>#${data.order_id}</strong> has been <strong>${data.status}</strong>.</p>
      ${data.total_amount ? `<p><strong>Total Amount:</strong> KES ${data.total_amount.toLocaleString()}</p>` : ''}
      <p>Thank you for choosing SiletoExpress!</p>
      <hr style="margin: 20px 0;">
      <p style="color: #666; font-size: 12px;">
        This is an automated message. Please do not reply to this email.
      </p>
    </div>
  `;

  const emailPayload = {
    sender: {
      name: Deno.env.get("SENDER_NAME") || "SiletoExpress",
      email: Deno.env.get("SENDER_EMAIL") || "noreply@siletoexpress.com"
    },
    to: [{ email: data.email, name: data.name }],
    subject: subject,
    htmlContent: htmlContent
  };

  console.log("📧 Sending email via Brevo to:", data.email);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "api-key": brevoApiKey
    },
    body: JSON.stringify(emailPayload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Brevo email error:", errorText);
    throw new Error(`Brevo email failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log("✅ Email sent successfully:", result);
  return result;
}

async function sendSMS(data: { phone: string; order_id: string; status: string }) {
  const apiKey = Deno.env.get("AFRICASTALKING_API_KEY");
  const username = Deno.env.get("AFRICASTALKING_USERNAME");

  if (!apiKey || !username) {
    console.log("⚠️ SMS credentials not configured, skipping SMS");
    return;
  }

  const message = `Hello! Your SiletoExpress order #${data.order_id} has been ${data.status}. Thank you for choosing us!`;

  console.log("📱 Sending SMS to:", data.phone);

  const smsPayload = new URLSearchParams({
    username: username,
    to: data.phone.startsWith('+') ? data.phone : `+254${data.phone.replace(/^0/, '')}`,
    message: message,
    from: "SiletoExpress"
  });

  const response = await fetch("https://api.sandbox.africastalking.com/version1/messaging", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "apiKey": apiKey
    },
    body: smsPayload
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ SMS error:", errorText);
    throw new Error(`SMS failed: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log("✅ SMS sent successfully:", result);
  return result;
}

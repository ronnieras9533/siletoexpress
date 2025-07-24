// functions/send-delivery-notification/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
// Serve edge function
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  try {
    const body = await req.json();
    const { order_id, user_id, phone_number, total_amount, county, delivery_address } = body;
    if (!order_id || !user_id || !phone_number || !total_amount || !county || !delivery_address) {
      return new Response(JSON.stringify({
        error: "Missing required fields"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    // Get user profile
    const { data: profile, error: profileError } = await supabase.from("profiles").select("full_name, email").eq("id", user_id).single();
    if (profileError || !profile) {
      console.error("Failed to fetch profile:", profileError?.message);
      return new Response(JSON.stringify({
        error: "Failed to fetch user profile"
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const userName = profile.full_name || "Customer";
    const userEmail = profile.email;
    // Save notification in DB
    const { error: notificationError } = await supabase.from("notifications").insert({
      user_id,
      title: "Order Delivered Successfully",
      message: `Your order #${order_id} has been successfully delivered to ${delivery_address}, ${county}.`,
      type: "order_status",
      order_id
    });
    if (notificationError) {
      console.error("Failed to insert notification:", notificationError.message);
    }
    // === Optional: Send SMS using Africa's Talking ===
    if (phone_number) {
      const smsMessage = `Hello ${userName}, your order #${order_id} has been delivered. Thank you for shopping with SiletoExpress!`;
      // Replace with actual API call to Africa's Talking
      console.log("📲 SMS to send:", {
        to: phone_number,
        message: smsMessage
      });
    }
    // === Optional: Send email using Resend ===
    if (userEmail) {
      const emailSubject = "Order Delivered Successfully - SiletoExpress";
      const emailBody = `
        <h2>Order Delivered Successfully!</h2>
        <p>Hi ${userName},</p>
        <p>Your order <strong>#${order_id}</strong> has been delivered to:</p>
        <p><strong>${delivery_address}, ${county}</strong></p>
        <p><strong>Total: KES ${total_amount.toLocaleString()}</strong></p>
        <p>Thank you for shopping with SiletoExpress!</p>
      `;
      // Replace with actual Resend API call
      console.log("📧 Email to send:", {
        to: userEmail,
        subject: emailSubject,
        html: emailBody
      });
    }
    return new Response(JSON.stringify({
      success: true
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    return new Response(JSON.stringify({
      error: "Unexpected server error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});

// supabase/functions/create-order/index.ts
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";
import { supabase } from "./lib/supabaseClient.ts";

serve(async (req) => {
  try {
    const { user_id, email, phone, method, amount } = await req.json();

    if (!user_id || !email || !phone || !method || !amount) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400 });
    }

    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          user_id,
          email,
          phone,
          payment_method: method,
          amount,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to create order" }), { status: 500 });
    }

    return new Response(JSON.stringify({ order_id: data.id, ...data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
});

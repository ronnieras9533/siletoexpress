// utils/createOrder.ts

import { supabase } from "@/lib/supabaseClient"; // adjust if using a different path

interface CreateOrderParams {
  method: string;
  amount: number;
  phone: string;
}

interface CreateOrderResponse {
  order_id: string;
  [key: string]: any; // extendable for any extra fields
}

export async function createOrder({
  method,
  amount,
  phone,
}: CreateOrderParams): Promise<CreateOrderResponse> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("User not authenticated.");
  }

  const payload = {
    user_id: user.id,
    email: user.email,
    phone,
    method,
    amount,
  };

  const response = await fetch(
    "https://hevbjzdahldvijwqtqcx.supabase.co/functions/v1/create-order",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  let data;
  try {
    data = await response.json();
  } catch (err) {
    throw new Error("Invalid JSON response from server.");
  }

  if (!response.ok) {
    throw new Error(data?.error || "Failed to create order.");
  }

  return data;
}

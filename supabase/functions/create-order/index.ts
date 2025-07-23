// utils/createOrder.ts

export async function createOrder({ method, amount, phone }: {
  method: string,
  amount: number,
  phone: string
}) {
  const user = supabase.auth.getUser();

  if (!user || !user.data?.user) {
    throw new Error("User not logged in.");
  }

  const payload = {
    user_id: user.data.user.id,
    email: user.data.user.email,
    phone,
    method,
    amount,
  };

  const response = await fetch("https://hevbjzdahldvijwqtqcx.supabase.co/functions/v1/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to create order.");
  }

  return data; // { order_id, ... }
}

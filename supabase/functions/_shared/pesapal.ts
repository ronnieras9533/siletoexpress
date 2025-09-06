
const BASE_URL = "https://pay.pesapal.com/v3/api";
const CONSUMER_KEY = Deno.env.get("PESAPAL_CONSUMER_KEY")!;
const CONSUMER_SECRET = Deno.env.get("PESAPAL_CONSUMER_SECRET")!;
const CALLBACK_URL = Deno.env.get("PESAPAL_CALLBACK_URL")!;
const REDIRECT_URL = "https://sileto-pharmaceuticals.netlify.app/pesapal-callback";

export async function getAccessToken() {
  try {
    const res = await fetch(`${BASE_URL}/Auth/RequestToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        consumer_key: CONSUMER_KEY,
        consumer_secret: CONSUMER_SECRET,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Error during Pesapal auth:", err);
    return null;
  }
}

export async function createPesapalPaymentOrder({
  orderId,
  amount,
  currency,
  email,
  phone,
  token,
}: {
  orderId: string;
  amount: number;
  currency: string;
  email: string;
  phone: string;
  token: string;
}) {
  const formattedPhone = formatPhone(phone);

  const body = {
    id: orderId,
    currency,
    amount,
    email,
    phone: formattedPhone,
    callback_url: CALLBACK_URL,
    redirect_mode: "PARENT_WINDOW",
    notification_id: Deno.env.get("PESAPAL_IPN_ID")!, // Must be valid
  };

  try {
    const res = await fetch(`${BASE_URL}/Transactions/SubmitOrderRequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Failed to create Pesapal order", err);
    return { error: "Order creation failed" };
  }
}

function formatPhone(phone: string): string {
  return phone.startsWith("0") ? `254${phone.slice(1)}` : phone;
}

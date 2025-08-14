export async function handler(event, context) {
  const SUPABASE_FUNCTION_URL = "https://hevbjzdahldvijwqtqcx.supabase.co/functions/v1/pesapal-ipn";

  try {
    const res = await fetch(SUPABASE_FUNCTION_URL, {
      method: event.httpMethod,
      headers: {
        ...event.headers,
        host: "hevbjzdahldvijwqtqcx.supabase.co", // avoid Netlify host header
      },
      body: event.body,
    });

    const body = await res.text(); // or use res.json() if Supabase returns JSON

    return {
      statusCode: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "text/plain",
      },
      body,
    };
  } catch (error) {
    console.error("Proxy Error:", error);
    return {
      statusCode: 500,
      body: "Error forwarding IPN to Supabase",
    };
  }
}

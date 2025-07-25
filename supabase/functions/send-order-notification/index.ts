import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SmtpClient } from "https://deno.land/x/smtp/mod.ts";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const { email, name, order_id, status } = await req.json();

  if (!email || !order_id || !status) {
    return new Response("Missing fields", { status: 400 });
  }

  const subject = status === "confirmed"
    ? `Order #${order_id} Confirmed`
    : `Order #${order_id} Delivered`;

  const html = `
    <h3>Hello ${name || "Customer"},</h3>
    <p>Your order <strong>#${order_id}</strong> has been <strong>${status}</strong>.</p>
    <p>Thank you for shopping with SiletoExpress!</p>
  `;

  const smtp = new SmtpClient();

  try {
    await smtp.connectTLS({
      hostname: Deno.env.get("SMTP_HOST")!,
      port: parseInt(Deno.env.get("SMTP_PORT")!),
      username: Deno.env.get("SMTP_USER")!,
      password: Deno.env.get("SMTP_PASS")!,
    });

    await smtp.send({
      from: `SiletoExpress <${Deno.env.get("SMTP_USER")!}>`,
      to: email,
      subject,
      content: html,
      html: html,
    });

    await smtp.close();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error("SMTP error:", err);
    return new Response(JSON.stringify({ error: "Failed to send email" }), { status: 500 });
  }
});

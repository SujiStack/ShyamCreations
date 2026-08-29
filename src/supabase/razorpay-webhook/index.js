import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Verify Razorpay Webhook signature using Web Crypto HMAC SHA-256
 */
async function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawBody);
  const keyData = encoder.encode(secret);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const hmac = await crypto.subtle.sign("HMAC", cryptoKey, data);
  const hashArray = Array.from(new Uint8Array(hmac));
  const expectedSignature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return expectedSignature.toLowerCase() === signature.toLowerCase();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const signature = req.headers.get("x-razorpay-signature") || "";
    const rawBody = await req.text();

    if (!webhookSecret) {
      console.warn("RAZORPAY_WEBHOOK_SECRET not configured. Skipping signature verification in test environment.");
    } else {
      const isValid = await verifyWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.error("Invalid webhook signature from Razorpay");
        return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    console.log(`Received Razorpay webhook event: ${event}`, {
      paymentId: paymentEntity?.id,
      orderId: orderEntity?.id || paymentEntity?.order_id,
    });

    if (supabaseUrl && supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
      const paymentId = paymentEntity?.id;
      const orderId = paymentEntity?.order_id || orderEntity?.id;
      const notes = paymentEntity?.notes || orderEntity?.notes || {};
      const bookingRef = notes.bookingRef;
      const orderType = notes.orderType;

      // Handle payment.captured or order.paid (Idempotent update)
      if (event === "payment.captured" || event === "order.paid") {
        if (orderId) {
          // 1. Update payments table
          await supabaseAdmin.from("payments").upsert(
            [
              {
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                booking_ref: bookingRef,
                order_type: orderType || "general",
                amount: (paymentEntity?.amount || orderEntity?.amount || 0) / 100,
                currency: paymentEntity?.currency || "INR",
                payment_status: "PAID",
                payment_method: paymentEntity?.method || "Razorpay",
                updated_at: new Date().toISOString(),
              },
            ],
            { onConflict: "razorpay_order_id" }
          );

          // 2. Update booking / jewellery records
          if (bookingRef) {
            if (orderType === "henna") {
              await supabaseAdmin
                .from("bookings")
                .update({ status: "Confirmed" })
                .eq("ref", bookingRef);
            } else if (orderType === "jewellery_single" || orderType === "jewellery_bag") {
              await supabaseAdmin
                .from("jewellery_customers")
                .update({
                  payment_status: "Paid",
                  order_status: "Confirmed",
                  upi_transaction_id: paymentId || "RAZORPAY-WEBHOOK",
                })
                .eq("order_ref", bookingRef);
            }
          }
        }
      } else if (event === "payment.failed") {
        if (orderId) {
          await supabaseAdmin.from("payments").upsert(
            [
              {
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                booking_ref: bookingRef,
                payment_status: "FAILED",
                notes: paymentEntity?.error_description || "Payment failed",
                updated_at: new Date().toISOString(),
              },
            ],
            { onConflict: "razorpay_order_id" }
          );
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

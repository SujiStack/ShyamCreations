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

/**
 * Idempotently log a webhook event into the payment_events audit trail.
 */
async function logEvent(
  admin: any,
  payload: any,
  bookingRef: string,
  status: string,
  amount: number,
  method: string,
  errorDescription: string
): Promise<void> {
  const paymentEntity = payload.payload?.payment?.entity || {};
  const refundEntity = payload.payload?.refund?.entity || {};
  const orderEntity = payload.payload?.order?.entity || {};

  const entityId = refundEntity.id || paymentEntity.id || orderEntity.id || null;

  try {
    await admin.from("payment_events").upsert(
      [
        {
          event_type: payload.event || "unknown",
          entity_id: entityId,
          razorpay_order_id: paymentEntity.order_id || orderEntity.id || refundEntity.order_id || null,
          razorpay_payment_id: paymentEntity.id || refundEntity.payment_id || null,
          booking_ref: bookingRef || null,
          status,
          amount: amount ?? null,
          method: method || null,
          error_description: errorDescription || null,
          raw_payload: payload,
        },
      ],
      { onConflict: "entity_id,event_type" }
    );
  } catch (e) {
    console.warn("payment_events log failed:", e);
  }
}

/**
 * Best-effort insert of an order-less payment (checkout opened without order_id).
 * Dedupes on razorpay_payment_id.
 */
async function logOrphanPayment(
  admin: any,
  paymentId: string,
  bookingRef: string,
  orderType: string,
  amountInr: number,
  method: string,
  status: string,
  extra: any = {}
): Promise<void> {
  if (!paymentId) return;
  try {
    const existing = await admin
      .from("payments")
      .select("id")
      .eq("razorpay_payment_id", paymentId)
      .maybeSingle();
    if (existing.data) return;

    const row: any = {
      booking_ref: bookingRef || "unknown",
      order_type: orderType || "general",
      razorpay_payment_id: paymentId,
      amount: amountInr,
      currency: "INR",
      payment_method: method || "Razorpay",
      payment_status: status,
    };
    if (status === "CAPTURED") row.captured_at = new Date().toISOString();
    if (status === "FAILED") {
      row.failed_at = new Date().toISOString();
      row.failure_reason = extra.reason || null;
    }
    await admin.from("payments").insert([row]);
  } catch (e) {
    console.warn("orphan payment insert failed:", e);
  }
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
    const paymentEntity = payload.payload?.payment?.entity || {};
    const refundEntity = payload.payload?.refund?.entity || {};
    const orderEntity = payload.payload?.order?.entity || {};

    const paymentId = paymentEntity.id || refundEntity.payment_id || null;
    const orderId = paymentEntity.order_id || orderEntity.id || refundEntity.order_id || null;
    const refundId = refundEntity.id || null;
    const notes = paymentEntity.notes || orderEntity.notes || refundEntity.notes || {};
    const bookingRef = notes.bookingRef || null;
    const orderType = notes.orderType || null;
    const amountInr = (paymentEntity.amount || orderEntity.amount || refundEntity.amount || 0) / 100;
    const method = paymentEntity.method || refundEntity.method || null;

    console.log(`Received Razorpay webhook event: ${event}`, {
      paymentId,
      orderId,
      refundId,
      bookingRef,
      amountInr,
    });

    if (supabaseUrl && supabaseServiceKey) {
      const admin = createClient(supabaseUrl, supabaseServiceKey);

      // ---------- 1. AUTHORIZED / BANK SENT (funds authorized with bank) ----------
      if (event === "payment.authorized") {
        if (orderId) {
          await logEvent(admin, payload, bookingRef, "AUTHORIZED", amountInr, method, null);
          await admin.from("payments").upsert(
            [
              {
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                booking_ref: bookingRef || "unknown",
                order_type: orderType || "general",
                amount: amountInr,
                payment_status: "AUTHORIZED",
                authorized_at: new Date().toISOString(),
              },
            ],
            { onConflict: "razorpay_order_id" }
          );
        }
      }
      // ---------- 2. PROCESSING (e.g. pending bank confirmation) ----------
      else if (event === "payment.processing") {
        if (orderId) {
          await logEvent(admin, payload, bookingRef, "PROCESSING", amountInr, method, null);
          await admin.from("payments").upsert(
            [{ razorpay_order_id: orderId, payment_status: "PROCESSING" }],
            { onConflict: "razorpay_order_id" }
          );
        }
      }
      // ---------- 3. CAPTURED / ORDER PAID (SUCCESS) ----------
      else if (event === "payment.captured" || event === "order.paid") {
        if (orderId) {
          await logEvent(admin, payload, bookingRef, "CAPTURED", amountInr, method, null);
          await admin.from("payments").upsert(
            [
              {
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                booking_ref: bookingRef || "unknown",
                order_type: orderType || "general",
                amount: amountInr,
                currency: paymentEntity.currency || "INR",
                payment_status: "CAPTURED",
                payment_method: method || "Razorpay",
                captured_at: new Date().toISOString(),
              },
            ],
            { onConflict: "razorpay_order_id" }
          );

          if (bookingRef) {
            if (orderType === "henna") {
              await admin.from("bookings").update({ status: "Confirmed" }).eq("ref", bookingRef);
            } else if (orderType === "jewellery_single" || orderType === "jewellery_bag") {
              await admin
                .from("jewellery_customers")
                .update({ payment_status: "Paid", order_status: "Confirmed", upi_transaction_id: paymentId || "RAZORPAY" })
                .eq("order_ref", bookingRef);
            } else if (orderType === "jewellery_rental") {
              await admin
                .from("jewellery_bookings")
                .update({ payment_status: "Paid", status: "Confirmed", transaction_id: paymentId || "RAZORPAY" })
                .eq("booking_ref", bookingRef);
            }
          }
        } else if (paymentId) {
          await logEvent(admin, payload, bookingRef, "CAPTURED", amountInr, method, null);
          await logOrphanPayment(admin, paymentId, bookingRef, orderType, amountInr, method, "CAPTURED");
        }
      }
      // ---------- 4. FAILED ----------
      else if (event === "payment.failed" || event === "order.payment_failed") {
        if (orderId) {
          const reason = paymentEntity.error_description || paymentEntity.error_reason || "Payment failed";
          await logEvent(admin, payload, bookingRef, "FAILED", amountInr, method, reason);
          await admin.from("payments").upsert(
            [
              {
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                booking_ref: bookingRef || "unknown",
                payment_status: "FAILED",
                failure_reason: reason,
                failed_at: new Date().toISOString(),
              },
            ],
            { onConflict: "razorpay_order_id" }
          );
        } else if (paymentId) {
          const reason = paymentEntity.error_description || paymentEntity.error_reason || "Payment failed";
          await logEvent(admin, payload, bookingRef, "FAILED", amountInr, method, reason);
          await logOrphanPayment(admin, paymentId, bookingRef, orderType, amountInr, method, "FAILED", { reason });
        }
      }
      // ---------- 5. REVERSED (bank return of funds) ----------
      else if (event === "payment.reversed") {
        if (orderId) {
          await logEvent(admin, payload, bookingRef, "REVERSED", amountInr, method, null);
          await admin.from("payments").upsert(
            [
              {
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                booking_ref: bookingRef || "unknown",
                payment_status: "REVERSED",
                reversed_at: new Date().toISOString(),
                amount_refunded: amountInr,
              },
            ],
            { onConflict: "razorpay_order_id" }
          );
        }
      }
      // ---------- 6. REFUND INITIATED / PARTIAL ----------
      else if (event === "refund.created" || event === "payment.partial_refund") {
        if (refundId) {
          await logEvent(admin, payload, bookingRef, "REFUND_INITIATED", amountInr, method, null);
          await admin.from("refunds").upsert(
            [
              {
                razorpay_refund_id: refundId,
                razorpay_payment_id: paymentId,
                razorpay_order_id: orderId,
                booking_ref: bookingRef || "unknown",
                amount: amountInr,
                refund_status: "INITIATED",
                raw_payload: payload,
              },
            ],
            { onConflict: "razorpay_refund_id" }
          );
        }
      }
      // ---------- 7. REFUND PROCESSED (money returned to customer's bank) ----------
      else if (event === "refund.processed") {
        if (refundId) {
          await logEvent(admin, payload, bookingRef, "REFUND_PROCESSED", amountInr, method, null);
          await admin.from("refunds").upsert(
            [
              {
                razorpay_refund_id: refundId,
                razorpay_payment_id: paymentId,
                razorpay_order_id: orderId,
                booking_ref: bookingRef || "unknown",
                amount: amountInr,
                refund_status: "PROCESSED",
                processed_at: new Date().toISOString(),
                raw_payload: payload,
              },
            ],
            { onConflict: "razorpay_refund_id" }
          );
          if (orderId) {
            await admin
              .from("payments")
              .update({ payment_status: "REFUNDED", amount_refunded: amountInr, reversed_at: new Date().toISOString() })
              .eq("razorpay_order_id", orderId);
          }
        }
      }
      // ---------- 8. REFUND FAILED ----------
      else if (event === "refund.failed") {
        if (refundId) {
          const reason = refundEntity.notes?.reason || refundEntity.fail_reason || "Refund failed";
          await logEvent(admin, payload, bookingRef, "REFUND_FAILED", amountInr, method, reason);
          await admin.from("refunds").upsert(
            [
              {
                razorpay_refund_id: refundId,
                razorpay_payment_id: paymentId,
                razorpay_order_id: orderId,
                booking_ref: bookingRef || "unknown",
                amount: amountInr,
                refund_status: "FAILED",
                refund_reason: reason,
                raw_payload: payload,
              },
            ],
            { onConflict: "razorpay_refund_id" }
          );
        }
      }
      // ---------- 9. Any other event: log only (audit completeness) ----------
      else {
        await logEvent(admin, payload, bookingRef, (paymentEntity.status || event).toUpperCase(), amountInr, method, null);
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

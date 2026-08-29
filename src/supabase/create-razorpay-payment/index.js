import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Verify Razorpay HMAC-SHA256 signature using standard Web Crypto API
 */
async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${orderId}|${paymentId}`);
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
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!razorpayKeySecret) {
      return new Response(
        JSON.stringify({ error: "RAZORPAY_KEY_SECRET is not configured in Supabase Edge Function Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingRef,
      orderType,
      amount,
      customerName,
      customerEmail,
      customerPhone,
      itemsToDecrement,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingRef) {
      return new Response(
        JSON.stringify({ error: "Missing required verification fields." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Cryptographically verify signature
    const isValid = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      razorpayKeySecret
    );

    if (!isValid) {
      console.error("Razorpay signature verification failed for:", { razorpay_order_id, razorpay_payment_id });
      return new Response(
        JSON.stringify({ success: false, error: "Invalid Razorpay payment signature." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: Update Supabase Records with confirmed payment status
    if (supabaseUrl && supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      // 2a. Update or insert into payments table
      try {
        await supabaseAdmin.from("payments").upsert(
          [
            {
              booking_ref: bookingRef,
              order_type: orderType || "general",
              razorpay_order_id,
              razorpay_payment_id,
              razorpay_signature,
              amount: amount || 0,
              currency: "INR",
              customer_name: customerName,
              customer_email: customerEmail,
              customer_phone: customerPhone,
              payment_status: "PAID",
              payment_method: "Razorpay (UPI / Card / NetBanking)",
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "razorpay_order_id" }
        );
      } catch (pErr) {
        console.warn("Could not upsert into payments table:", pErr);
      }

      // 2b. Update bookings table (for Henna bookings)
      if (orderType === "henna" || !orderType) {
        await supabaseAdmin
          .from("bookings")
          .update({
            status: "Confirmed",
            // If payment columns exist, these will update; otherwise ignored by supabase
          })
          .eq("ref", bookingRef);
      }

      // 2c. Update jewellery_customers / jewellery_bookings table
      if (orderType === "jewellery_single" || orderType === "jewellery_bag") {
        await supabaseAdmin
          .from("jewellery_customers")
          .update({
            payment_status: "Paid",
            order_status: "Confirmed",
            upi_transaction_id: razorpay_payment_id,
          })
          .eq("order_ref", bookingRef);
      } else if (orderType === "jewellery_rental") {
        await supabaseAdmin
          .from("jewellery_bookings")
          .update({
            payment_status: "Paid",
            status: "Confirmed",
            transaction_id: razorpay_payment_id,
          })
          .eq("booking_ref", bookingRef);
      }

      // 2d. Decrement inventory stock safely if requested
      if (Array.isArray(itemsToDecrement) && itemsToDecrement.length > 0) {
        for (const itm of itemsToDecrement) {
          if (itm.productId) {
            const { data: currentJewel } = await supabaseAdmin
              .from("jewellery")
              .select("stock, stock_label")
              .eq("id", itm.productId)
              .single();

            if (currentJewel && typeof currentJewel.stock === "number") {
              const newStock = Math.max(0, currentJewel.stock - (itm.quantity || 1));
              await supabaseAdmin
                .from("jewellery")
                .update({
                  stock: newStock,
                  stock_label: newStock > 0 ? `${newStock} Available` : "Out of Stock",
                })
                .eq("id", itm.productId);
            }
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment successfully verified and records updated.",
        bookingRef,
        razorpay_payment_id,
        razorpay_order_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Verification error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to verify payment." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

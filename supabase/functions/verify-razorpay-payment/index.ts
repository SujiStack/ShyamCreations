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
      serviceOrProductName,
      jewelleryId,
      deliveryAddress,
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

      // 2a. Log the verified payment into the audit trail (idempotent)
      try {
        await supabaseAdmin.from("payment_events").upsert(
          [
            {
              event_type: "client.signature_verified",
              entity_id: razorpay_payment_id,
              razorpay_order_id,
              razorpay_payment_id,
              booking_ref: bookingRef,
              status: "PAID",
              amount: amount || null,
              method: "Razorpay (client verified)",
              raw_payload: { razorpay_order_id, razorpay_payment_id, bookingRef, orderType },
            },
          ],
          { onConflict: "entity_id,event_type" }
        );
      } catch (eLog) {
        console.warn("payment_events log (verify) failed:", eLog);
      }

      // 2b. Update or insert into payments table
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

      const fmtINR = (v: any) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

      // 2c. Henna booking — confirm it, or register it if the client never saved it
      if (orderType === "henna" || !orderType) {
        const existingBooking = await supabaseAdmin
          .from("bookings")
          .select("id")
          .eq("ref", bookingRef)
          .maybeSingle();
        if (existingBooking.data) {
          await supabaseAdmin.from("bookings").update({ status: "Confirmed" }).eq("ref", bookingRef);
        } else {
          await supabaseAdmin.from("bookings").insert([
            {
              ref: bookingRef,
              name: customerName || "Client",
              phone: customerPhone || "",
              wa: customerPhone || "",
              email: customerEmail || "",
              service: serviceOrProductName || "Henna Booking",
              notes: deliveryAddress || "",
              date: new Date().toISOString().split("T")[0],
              slot: "Confirmed via Razorpay",
              status: "Confirmed",
            },
          ]);
        }
      }

      // 2d. Jewellery orders — confirm them, or register if the client never saved them
      if (orderType === "jewellery_single" || orderType === "jewellery_bag") {
        const existingCustomer = await supabaseAdmin
          .from("jewellery_customers")
          .select("id")
          .eq("order_ref", bookingRef)
          .maybeSingle();
        if (existingCustomer.data) {
          await supabaseAdmin
            .from("jewellery_customers")
            .update({
              payment_status: "Paid",
              order_status: "Confirmed",
              upi_transaction_id: razorpay_payment_id,
            })
            .eq("order_ref", bookingRef);
        } else {
          await supabaseAdmin.from("jewellery_customers").insert([
            {
              order_ref: bookingRef,
              customer_name: customerName || "Client",
              phone: customerPhone || "",
              whatsapp: customerPhone || "",
              email: customerEmail || "",
              delivery_address: deliveryAddress || "Studio Pickup",
              product_name: serviceOrProductName || "Jewellery Order",
              jewellery_id: jewelleryId || "online-order",
              item_price: fmtINR(amount),
              shipping_fee: "₹50",
              total_amount: fmtINR(amount),
              payment_method: "Razorpay (UPI / Card / NetBanking)",
              upi_transaction_id: razorpay_payment_id,
              payment_status: "Paid",
              order_status: "Confirmed",
              notes: "Auto-registered by Razorpay payment verification",
            },
          ]);
        }
      } else if (orderType === "jewellery_rental") {
        const existingRental = await supabaseAdmin
          .from("jewellery_bookings")
          .select("id")
          .eq("booking_ref", bookingRef)
          .maybeSingle();
        if (existingRental.data) {
          await supabaseAdmin
            .from("jewellery_bookings")
            .update({
              payment_status: "Paid",
              status: "Confirmed",
              transaction_id: razorpay_payment_id,
            })
            .eq("booking_ref", bookingRef);
        } else {
          await supabaseAdmin.from("jewellery_bookings").insert([
            {
              booking_ref: bookingRef,
              client_name: customerName || "Client",
              phone: customerPhone || "",
              email: customerEmail || "",
              product_name: serviceOrProductName || "Jewellery Rental",
              total_price: fmtINR(amount),
              location: deliveryAddress || "Studio Pickup",
              payment_status: "Paid",
              payment_method: "Razorpay (UPI / Card / NetBanking)",
              transaction_id: razorpay_payment_id,
              status: "Confirmed",
              notes: "Auto-registered by Razorpay payment verification",
            },
          ]);
        }
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

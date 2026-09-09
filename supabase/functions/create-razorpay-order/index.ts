import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CreateOrderRequestBody {
  bookingRef: string;
  orderType: "henna" | "jewellery_single" | "jewellery_bag" | "jewellery_rental";
  amount: number; // in INR rupees
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  serviceOrProductName?: string;
  notes?: string;
  jewelleryId?: string;
  items?: Array<{ id: string; name: string; quantity: number; price: number }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!razorpayKeyId || !razorpayKeySecret) {
      return new Response(
        JSON.stringify({
          error: "RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured in Supabase Edge Function Secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: CreateOrderRequestBody = await req.json();
    const {
      bookingRef,
      orderType,
      amount: clientAmount,
      currency = "INR",
      customerName = "",
      customerEmail = "",
      customerPhone = "",
      serviceOrProductName = "",
      notes = "",
      jewelleryId,
      items,
    } = body;

    if (!bookingRef) {
      return new Response(
        JSON.stringify({ error: "Missing required field: bookingRef" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let validatedAmount = clientAmount;

    // Server-Side Amount Validation:
    // If Supabase service role key is configured, verify pricing from database
    if (supabaseUrl && supabaseServiceKey) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

      if (orderType === "jewellery_single" && jewelleryId) {
        const { data: jewel } = await supabaseAdmin
          .from("jewellery")
          .select("price, amount")
          .eq("id", jewelleryId)
          .single();

        if (jewel) {
          const dbPrice = typeof jewel.amount === "number"
            ? jewel.amount
            : parseInt(String(jewel.price || "0").replace(/\D/g, ""), 10);
          if (dbPrice > 0) {
            const qty = items?.[0]?.quantity || 1;
            const shipping = 50;
            validatedAmount = dbPrice * qty + shipping;
          }
        }
      } else if (orderType === "jewellery_bag" && items && items.length > 0) {
        // Query products from database to calculate exact total
        const itemIds = items.map((i) => i.id);
        const { data: dbItems } = await supabaseAdmin
          .from("jewellery")
          .select("id, price, amount")
          .in("id", itemIds);

        if (dbItems && dbItems.length > 0) {
          let calculatedSubtotal = 0;
          for (const item of items) {
            const match = dbItems.find((d) => d.id === item.id);
            const unitPrice = match
              ? (typeof match.amount === "number" ? match.amount : parseInt(String(match.price || "0").replace(/\D/g, ""), 10))
              : item.price;
            calculatedSubtotal += unitPrice * (item.quantity || 1);
          }
          validatedAmount = calculatedSubtotal + 50; // Add 50 shipping
        }
      }
    }

    // Minimum amount protection (e.g. ₹1)
    if (!validatedAmount || validatedAmount < 1) {
      validatedAmount = clientAmount > 0 ? clientAmount : 100;
    }

    // Razorpay requires amount in paise (smallest currency unit: 1 INR = 100 paise)
    const amountInPaise = Math.round(validatedAmount * 100);

    // Call Razorpay API to create order
    const authHeader = "Basic " + btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const receiptId = `${bookingRef.replace(/[^a-zA-Z0-9_-]/g, "")}`.slice(0, 40);

    const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: currency.toUpperCase(),
        receipt: receiptId,
        notes: {
          bookingRef,
          orderType,
          customerName,
          customerEmail,
          customerPhone,
          serviceOrProductName,
          notes,
        },
      }),
    });

    const rzpData = await rzpResponse.json();

    if (!rzpResponse.ok) {
      console.error("Razorpay order creation failed:", rzpData);
      return new Response(
        JSON.stringify({ error: rzpData.error?.description || "Failed to create Razorpay order" }),
        { status: rzpResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Optional: Log pending transaction in payments table
    if (supabaseUrl && supabaseServiceKey) {
      try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        await supabaseAdmin.from("payments").insert([
          {
            booking_ref: bookingRef,
            order_type: orderType,
            razorpay_order_id: rzpData.id,
            amount: validatedAmount,
            currency: currency.toUpperCase(),
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            payment_status: "PENDING_PAYMENT",
            notes: notes || serviceOrProductName,
          },
        ]);
      } catch (logErr) {
        console.warn("Could not insert pending payment log (payments table may need to be created):", logErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        razorpayOrderId: rzpData.id,
        razorpayKeyId: razorpayKeyId,
        amount: amountInPaise,
        amountInRupees: validatedAmount,
        currency: rzpData.currency || "INR",
        bookingRef,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("Edge Function Error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

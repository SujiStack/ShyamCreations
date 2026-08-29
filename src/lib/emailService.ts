export interface BookingEmailParams {
  ref: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientWa?: string;
  serviceName: string;
  serviceCategory: string;
  date: string;
  timeSlot: string;
  location?: string;
  specialRequests?: string;
  type?: string;
  paymentStatus?: string;
  paymentAmount?: string;
  paymentMethod?: string;
  transactionId?: string;
}

export interface EmailSendResult {
  clientEmailSent: boolean;
  adminEmailSent: boolean;
  message: string;
  error?: string;
}

/**
 * Safely import emailjs dynamically to avoid build errors if node_modules is missing on local environment
 */
async function getEmailJS() {
  try {
    const module = await import('@emailjs/browser');
    return module.default || module;
  } catch (err) {
    console.warn('EmailJS package (@emailjs/browser) is missing from local node_modules. Run `npm install` in your terminal.');
    return null;
  }
}

function cleanEnv(val: string | undefined, fallback: string): string {
  if (!val) return fallback;
  const cleaned = val.trim().replace(/^['"]|['"]$/g, '').trim();
  return cleaned || fallback;
}

/**
 * Send booking confirmation emails to both customer and admin using EmailJS
 */
export async function sendBookingConfirmationEmails(
  booking: BookingEmailParams
): Promise<EmailSendResult> {
  const serviceId = cleanEnv(import.meta.env.VITE_EMAILJS_SERVICE_ID, 'service_xv40d4h');
  const clientTemplateId = cleanEnv(import.meta.env.VITE_EMAILJS_CUSTOMER_TEMPLATE_ID || import.meta.env.VITE_EMAILJS_TEMPLATE_ID, 'template_v2mtogj'); // Customer confirmation template
  const adminTemplateId = cleanEnv(import.meta.env.VITE_EMAILJS_ADMIN_TEMPLATE_ID, 'template_fqn6e0q');  // Admin notification template
  const publicKey = cleanEnv(import.meta.env.VITE_EMAILJS_PUBLIC_KEY, 'HQgSNXufMjsC5ZeT4');
  const adminEmail = cleanEnv(import.meta.env.VITE_ADMIN_EMAIL, 'shyamcreationstudio@gmail.com');

  const emailjs = await getEmailJS();

  if (!emailjs) {
    return {
      clientEmailSent: false,
      adminEmailSent: false,
      message: 'EmailJS library dynamic loader failed.',
    };
  }

  // Initialize EmailJS with public key
  try {
    if (typeof emailjs.init === 'function') {
      emailjs.init(publicKey);
    }
  } catch (initErr) {
    console.warn('[EmailJS] Init warning:', initErr);
  }

  // Base parameters shared between templates
  const baseParams = {
    booking_ref: booking.ref,
    ref: booking.ref,
    reference_no: booking.ref,

    customer_name: booking.clientName,
    client_name: booking.clientName,
    user_name: booking.clientName,
    name: booking.clientName,
    to_name: booking.clientName,

    customer_phone: booking.clientPhone,
    client_phone: booking.clientPhone,
    phone: booking.clientPhone,
    mobile: booking.clientPhone,
    client_wa: booking.clientWa || booking.clientPhone,
    whatsapp: booking.clientWa || booking.clientPhone,

    package: booking.serviceName,
    package_name: booking.serviceName,
    service_name: booking.serviceName,
    service: booking.serviceName,

    occasion: booking.serviceCategory,
    category: booking.serviceCategory,
    service_category: booking.serviceCategory,

    date: booking.date,
    booking_date: booking.date,
    appointment_date: booking.date,

    time: booking.timeSlot,
    time_slot: booking.timeSlot,
    booking_time: booking.timeSlot,

    location: booking.location || 'Shyam Creations Studio / Client Venue',
    venue: booking.location || 'Shyam Creations Studio / Client Venue',
    notes: booking.specialRequests || 'None',
    special_notes: booking.specialRequests || 'None',
    special_requests: booking.specialRequests || 'None',

    payment_status: booking.paymentStatus || 'Advance Received',
    payment_amount: booking.paymentAmount || '₹200',
    payment_method: booking.paymentMethod || 'UPI / Google Pay',
    transaction_id: booking.transactionId || 'UPI-REF-PENDING',
    utr_number: booking.transactionId || 'None',

    intro_text: `Your appointment for ${booking.serviceName} on ${booking.date} at ${booking.timeSlot} is confirmed. Payment Status: ${booking.paymentStatus || 'Advance Received'} (${booking.paymentAmount || ''}). Thank you for choosing Shyam Creations Studio!`,
    badge_display: 'none',

    admin_email: adminEmail,
    studio_name: 'Shyam Creations Studio',
    studio_phone: '+91 9363710342',
    message: `New booking confirmation for ${booking.serviceName} on ${booking.date} at ${booking.timeSlot}. Reference: ${booking.ref}`,
  };

  // 1. Dispatch Customer Confirmation Email
  let clientSent = false;
  let clientErr = '';

  if (booking.clientEmail) {
    const customerEmailClean = booking.clientEmail.trim();
    const customerParams = {
      ...baseParams,
      // Target recipient parameters for EmailJS template
      to_email: customerEmailClean,
      customer_email: customerEmailClean,
      client_email: customerEmailClean,
      user_email: customerEmailClean,
      email: customerEmailClean,
      recipient_email: customerEmailClean,
      to: customerEmailClean,
      send_to: customerEmailClean,
      contact_email: customerEmailClean,
      target_email: customerEmailClean,
      destination_email: customerEmailClean,
      receiver_email: customerEmailClean,
      clientEmail: customerEmailClean,
      customerEmail: customerEmailClean,
      userEmail: customerEmailClean,
      toEmail: customerEmailClean,
      recipientEmail: customerEmailClean,
      admin_email: customerEmailClean, // Overrides {{admin_email}} if template uses it for routing

      customer_name: booking.clientName,
      client_name: booking.clientName,
      user_name: booking.clientName,
      to_name: booking.clientName,
      name: 'Shyam Creations Studio', // Matches {{name}} in EmailJS From Name field

      from_name: 'Shyam Creations Studio',
      sender_name: 'Shyam Creations Studio',
      studio_name: 'Shyam Creations Studio',
      studio_email: adminEmail,
      reply_to: adminEmail,
    };

    // Attempt 1: Try primary clientTemplateId (template_v2mtogj)
    if (clientTemplateId) {
      try {
        console.info(`[EmailJS] Dispatching Customer Confirmation (${clientTemplateId}) to: ${customerEmailClean}`);
        const res = await emailjs.send(serviceId, clientTemplateId, customerParams, { publicKey });
        console.log('[EmailJS] Customer Primary Email Success:', res);
        clientSent = true;
      } catch (err: any) {
        console.warn(`[EmailJS] Customer Primary Template (${clientTemplateId}) failed, trying string key...`, err);
        try {
          const res2 = await emailjs.send(serviceId, clientTemplateId, customerParams, publicKey);
          console.log('[EmailJS] Customer Primary Email Success (string key):', res2);
          clientSent = true;
        } catch (err2: any) {
          const errStr = err2?.text || err2?.message || (typeof err2 === 'object' ? JSON.stringify(err2) : String(err2));
          console.warn(`[EmailJS] Customer Primary Template (${clientTemplateId}) Failed: ${errStr}`);
          clientErr = errStr;
        }
      }
    }

    // Attempt 2 Fallback: If primary template failed or was not found, fallback to verified active template (adminTemplateId)
    if (!clientSent && adminTemplateId) {
      try {
        console.info(`[EmailJS] Customer Fallback: Sending via verified template (${adminTemplateId}) to: ${customerEmailClean}`);
        const fallbackRes = await emailjs.send(serviceId, adminTemplateId, customerParams, publicKey);
        console.log('[EmailJS] Customer Email Fallback Success:', fallbackRes);
        clientSent = true;
        clientErr = ''; // Clear error as fallback succeeded
      } catch (fallbackErr: any) {
        const fallbackErrStr = fallbackErr?.text || fallbackErr?.message || (typeof fallbackErr === 'object' ? JSON.stringify(fallbackErr) : String(fallbackErr));
        console.error('[EmailJS] Customer Email Fallback also Failed:', fallbackErrStr);
        clientErr = clientErr ? `Primary: ${clientErr} | Fallback: ${fallbackErrStr}` : fallbackErrStr;
      }
    }
  } else {
    clientErr = 'Missing customer email';
  }

  // Small pause between EmailJS API requests
  await new Promise(resolve => setTimeout(resolve, 300));

  // 2. Dispatch Admin Notification Email automatically
  let adminSent = false;
  let adminErr = '';

  if (adminTemplateId) {
    const adminParams = {
      ...baseParams,
      to_email: adminEmail,
      admin_email: adminEmail,
      customer_email: adminEmail,
      email: adminEmail,
      recipient_email: adminEmail,
      to: adminEmail,
      send_to: adminEmail,

      customer_name: booking.clientName,
      client_name: booking.clientName,
      user_name: booking.clientName,
      to_name: 'Shyam Creations Admin',

      name: booking.clientName,
      from_name: booking.clientName,
      reply_to: booking.clientEmail ? booking.clientEmail.trim() : adminEmail,
    };

    try {
      console.info(`[EmailJS] Dispatching Admin Notification (${adminTemplateId}) to: ${adminEmail}`);
      const res = await emailjs.send(serviceId, adminTemplateId, adminParams, publicKey);
      console.log('[EmailJS] Admin Email Success:', res);
      adminSent = true;
    } catch (err: any) {
      console.error('[EmailJS] Admin Email Failed:', err);
      adminErr = err?.text || err?.message || String(err);
    }
  } else {
    adminErr = 'Missing admin template ID';
  }

  return {
    clientEmailSent: clientSent,
    adminEmailSent: adminSent,
    message: `Customer Email (${booking.clientEmail}): ${clientSent ? '✓ Automatic Sent' : `Failed (${clientErr || 'Check template'})`}. Admin Email (${adminEmail}): ${adminSent ? '✓ Automatic Sent' : `Failed (${adminErr || 'Check template'})`}.`,
    error: clientErr || adminErr || undefined,
  };
}


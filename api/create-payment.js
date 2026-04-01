// api/create-payment.js — Vercel serverless function
// Accepts a Square payment nonce from the frontend and charges the card.
// Also decrements inventory in Supabase and sends order notification emails.

const { SquareClient, SquareEnvironment } = require('square');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

const square = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENV === 'production'
    ? SquareEnvironment.Production
    : SquareEnvironment.Sandbox,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Send email via Gmail SMTP
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

async function sendEmail({ to, subject, html }) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) { console.error('Gmail credentials missing'); return; }
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"Side Quest Complete" <${user}>`,
    to,
    subject,
    html,
  });
}

const STORE_EMAIL = 'sidequestcompletellc@gmail.com';
const FROM_EMAIL  = 'sidequestcompletellc@gmail.com';

function fmt(n) { return '$' + Number(n).toFixed(2); }

function itemsTable(items) {
  return items.map(i =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${i.name}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">×${i.qty}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${fmt(i.price * i.qty)}</td>
    </tr>`
  ).join('');
}

function addressBlock(a) {
  if (!a) return 'N/A';
  return `${a.firstName} ${a.lastName}<br>${a.address}<br>${a.city}, ${a.state} ${a.zip}`;
}

// ── Store notification email ──────────────────────────────────────────────────
function storeEmailHtml({ orderId, items, subtotal, shipping, total, email, shippingAddress, paymentId }) {
  return `
<!DOCTYPE html><html><body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:20px;">
  <h2 style="color:#b03af5;">🎮 New Order Received!</h2>
  <p><strong>Order ID:</strong> ${orderId}</p>
  <p><strong>Square Payment ID:</strong> ${paymentId}</p>

  <h3>Customer</h3>
  <p><strong>Email:</strong> ${email || 'Guest'}</p>
  <p><strong>Ship to:</strong><br>${addressBlock(shippingAddress)}</p>

  <h3>Items Ordered</h3>
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px;text-align:left;">Item</th>
        <th style="padding:8px;text-align:center;">Qty</th>
        <th style="padding:8px;text-align:right;">Price</th>
      </tr>
    </thead>
    <tbody>${itemsTable(items)}</tbody>
  </table>

  <table style="width:100%;margin-top:12px;">
    <tr><td>Subtotal</td><td style="text-align:right;">${fmt(subtotal)}</td></tr>
    <tr><td>Shipping</td><td style="text-align:right;">${shipping > 0 ? fmt(shipping) : 'FREE'}</td></tr>
    <tr><td><strong>Total Charged</strong></td><td style="text-align:right;"><strong>${fmt(total)}</strong></td></tr>
  </table>

  <hr style="margin:24px 0;">
  <p style="color:#888;font-size:12px;">Side Quest Complete — New Bedford, MA</p>
</body></html>`;
}

// ── Customer confirmation email ───────────────────────────────────────────────
function customerEmailHtml({ orderId, items, subtotal, shipping, total, shippingAddress }) {
  return `
<!DOCTYPE html><html><body style="font-family:sans-serif;color:#222;max-width:600px;margin:0 auto;padding:20px;">
  <div style="text-align:center;padding:20px 0;">
    <h1 style="font-family:monospace;color:#39ff14;background:#111;padding:16px;border-radius:8px;">
      SIDE QUEST<br>COMPLETE
    </h1>
  </div>

  <h2>✅ Order Confirmed!</h2>
  <p>Thanks for your order! We'll get it packed up and on its way soon.</p>
  <p><strong>Order #:</strong> ${orderId}</p>

  <h3>What you ordered</h3>
  <table style="width:100%;border-collapse:collapse;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:8px;text-align:left;">Item</th>
        <th style="padding:8px;text-align:center;">Qty</th>
        <th style="padding:8px;text-align:right;">Price</th>
      </tr>
    </thead>
    <tbody>${itemsTable(items)}</tbody>
  </table>

  <table style="width:100%;margin-top:12px;">
    <tr><td>Subtotal</td><td style="text-align:right;">${fmt(subtotal)}</td></tr>
    <tr><td>Shipping</td><td style="text-align:right;">${shipping > 0 ? fmt(shipping) : 'FREE 🎉'}</td></tr>
    <tr><td><strong>Total</strong></td><td style="text-align:right;"><strong>${fmt(total)}</strong></td></tr>
  </table>

  ${shippingAddress ? `
  <h3>Shipping to</h3>
  <p>${addressBlock(shippingAddress)}</p>` : ''}

  <hr style="margin:24px 0;">
  <p>Questions? Reply to this email or find us at Kilburn Mill, New Bedford, MA on weekends.</p>
  <p style="color:#888;font-size:12px;">Side Quest Complete — 2,476+ sales, 100% positive feedback ⭐</p>
</body></html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sourceId, amount, currency = 'USD', orderId, items, email, shippingAddress, userId } = req.body;

  if (!sourceId || !amount || !orderId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // ── Charge the card via Square ────────────────────────────────────────
    const paymentResponse = await square.payments.create({
      sourceId,
      idempotencyKey: orderId,
      amountMoney: {
        amount: BigInt(Math.round(amount * 100)),
        currency,
      },
      note: `Side Quest Complete — Order ${orderId}`,
      buyerEmailAddress: email || undefined,
    });

    const payment = paymentResponse.payment;

    if (payment.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Payment not completed', status: payment.status });
    }

    // ── Save order to Supabase ────────────────────────────────────────────
    const orderItems = items || [];
    const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = Math.max(0, parseFloat((amount - subtotal).toFixed(2)));

    const { error: orderError } = await supabase.from('orders').insert({
      id: orderId,
      user_id: userId || null,
      email: email || null,
      items: orderItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      shipping,
      total: parseFloat(amount.toFixed(2)),
      status: 'Paid',
      shipping_address: shippingAddress || null,
      points_earned: Math.round(amount),
      square_payment_id: payment.id,
    });
    if (orderError) console.error('Supabase order insert error:', orderError.message);

    // ── Decrement inventory ───────────────────────────────────────────────
    for (const item of orderItems) {
      const { data: product } = await supabase
        .from('products')
        .select('quantity, in_stock')
        .eq('id', item.id)
        .single();

      if (!product) continue;

      const newQty = Math.max(0, (product.quantity || 0) - (item.qty || 1));
      await supabase
        .from('products')
        .update({ quantity: newQty, in_stock: newQty > 0 })
        .eq('id', item.id);
    }

    // ── Send emails ───────────────────────────────────────────────────────
    const emailData = { orderId, items: orderItems, subtotal, shipping, total: amount, email, shippingAddress, paymentId: payment.id };

    // Store notification
    await sendEmail({
      to: STORE_EMAIL,
      subject: `🎮 New Order ${orderId} — ${fmt(amount)}`,
      html: storeEmailHtml(emailData),
    }).catch(e => console.error('Store email failed:', e.message));

    // Customer confirmation
    if (email) {
      await sendEmail({
        to: email,
        subject: `Order Confirmed! ${orderId} — Side Quest Complete`,
        html: customerEmailHtml(emailData),
      }).catch(e => console.error('Customer email failed:', e.message));
    }

    return res.status(200).json({
      success: true,
      paymentId: payment.id,
      orderId,
    });

  } catch (err) {
    console.error('Payment error:', err);
    const msg = err?.errors?.[0]?.detail || err.message || 'Payment failed';
    return res.status(500).json({ error: msg });
  }
};

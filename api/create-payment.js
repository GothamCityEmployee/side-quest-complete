// api/create-payment.js — Vercel serverless function
// Accepts a Square payment nonce from the frontend and charges the card.
// Also decrements inventory in Supabase on success.

const { Client, Environment } = require('square');
const { createClient } = require('@supabase/supabase-js');

const square = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENV === 'production'
    ? Environment.Production
    : Environment.Sandbox,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    const { result } = await square.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: orderId, // prevents double-charging on retries
      amountMoney: {
        amount: Math.round(amount * 100), // Square uses cents
        currency,
      },
      note: `Side Quest Complete — Order ${orderId}`,
      buyerEmailAddress: email || undefined,
    });

    const payment = result.payment;

    if (payment.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Payment not completed', status: payment.status });
    }

    // ── Save order to Supabase ────────────────────────────────────────────
    const orderItems = items || [];
    const subtotal = orderItems.reduce((s, i) => s + i.price * i.qty, 0);
    const shipping = parseFloat((amount - subtotal).toFixed(2));

    await supabase.from('orders').insert({
      id: orderId,
      user_id: userId || null,
      email: email || null,
      items: orderItems,
      subtotal: parseFloat(subtotal.toFixed(2)),
      shipping: Math.max(0, shipping),
      total: parseFloat(amount.toFixed(2)),
      status: 'Paid',
      shipping_address: shippingAddress || null,
      points_earned: Math.round(amount),
      square_payment_id: payment.id,
    });

    // ── Decrement inventory ───────────────────────────────────────────────
    for (const item of orderItems) {
      // Fetch current quantity
      const { data: product } = await supabase
        .from('products')
        .select('quantity, in_stock')
        .eq('id', item.id)
        .single();

      if (!product) continue;

      const newQty = Math.max(0, (product.quantity || 0) - (item.qty || 1));
      await supabase
        .from('products')
        .update({
          quantity: newQty,
          in_stock: newQty > 0,
        })
        .eq('id', item.id);
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

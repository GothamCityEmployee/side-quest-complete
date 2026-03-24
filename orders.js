// orders.js — SQC Order Management (Supabase-backed)
// Exports: window.SQCOrders

(function () {
  'use strict';

  window.SQCOrders = {

    // ── ID Generation ──────────────────────────────────────────────────────────
    generateOrderId() {
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const rand = String(Math.floor(Math.random() * 9000) + 1000);
      return `SQC-${date}-${rand}`;
    },

    // ── Save Order ─────────────────────────────────────────────────────────────
    async saveOrder(cartItems, subtotal, shipping, userId, shippingAddress, email) {
      const orderId = this.generateOrderId();
      const total = subtotal + shipping;
      const pointsEarned = userId ? Math.round(total) : 0;

      const order = {
        id: orderId,
        user_id: userId || null,
        email: email || null,
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          qty: item.qty || 1,
          image: item.image || null,
          emoji: item.emoji || '🎮'
        })),
        subtotal: parseFloat(subtotal.toFixed(2)),
        shipping: parseFloat(shipping.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        status: 'Processing',
        shipping_address: shippingAddress || null,
        points_earned: pointsEarned,
      };

      const { error } = await window.sqc.from('orders').insert(order);

      if (error) {
        console.error('SQCOrders.saveOrder error:', error.message);
        return { success: false, error: error.message };
      }

      // Award loyalty points
      if (userId && pointsEarned > 0) {
        await window.SQCAuth.addPoints(userId, pointsEarned);
      }

      return { success: true, order: { ...order }, pointsEarned };
    },

    // ── Get orders for current user ────────────────────────────────────────────
    async getMyOrders() {
      const user = await window.SQCAuth.getUser();
      if (!user) return [];

      const { data, error } = await window.sqc
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('SQCOrders.getMyOrders error:', error.message);
        return [];
      }

      return data || [];
    },

    // ── Get single order ───────────────────────────────────────────────────────
    async getOrderById(orderId) {
      const { data, error } = await window.sqc
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (error) return null;
      return data;
    },
  };
})();

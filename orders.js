// orders.js — SQC Order Management
// Exports: window.SQCOrders

(function () {
  'use strict';

  const ORDERS_KEY = 'sqc_orders';
  const USERS_KEY = 'sqc_users';

  const SQCOrders = {
    // ── ID Generation ──────────────────────────────────────────────────────────
    generateOrderId() {
      const now = new Date();
      const date = now.toISOString().slice(0, 10).replace(/-/g, '');
      const rand = String(Math.floor(Math.random() * 9000) + 1000);
      return `SQC-${date}-${rand}`;
    },

    // ── Save Order ─────────────────────────────────────────────────────────────
    saveOrder(cartItems, total, userId) {
      const orderId = this.generateOrderId();
      const pointsEarned = userId ? Math.round(total) : 0;

      const order = {
        id: orderId,
        date: new Date().toISOString(),
        items: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          qty: item.qty || 1,
          image: item.image || null,
          emoji: item.emoji || '🎮'
        })),
        total: parseFloat(total.toFixed(2)),
        status: 'Processing',
        pointsEarned,
        userId: userId || null
      };

      // Persist to global orders list
      const orders = this._getAllOrders();
      orders.unshift(order);
      localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

      // Attach to user record + award points
      if (userId) {
        try {
          const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
          const idx = users.findIndex(u => u.id === userId);
          if (idx !== -1) {
            users[idx].orderHistory = [orderId, ...(users[idx].orderHistory || [])];
            users[idx].points = (users[idx].points || 0) + pointsEarned;
            localStorage.setItem(USERS_KEY, JSON.stringify(users));
          }
        } catch (e) {
          console.error('SQCOrders: failed to update user record', e);
        }
      }

      return { order, pointsEarned };
    },

    // ── Retrieve Orders ────────────────────────────────────────────────────────
    getOrders(userId) {
      if (!userId) return [];
      try {
        const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const user = users.find(u => u.id === userId);
        if (!user || !user.orderHistory || !user.orderHistory.length) return [];

        const allOrders = this._getAllOrders();
        return user.orderHistory
          .map(id => allOrders.find(o => o.id === id))
          .filter(Boolean);
      } catch {
        return [];
      }
    },

    getOrderById(orderId) {
      return this._getAllOrders().find(o => o.id === orderId) || null;
    },

    // ── Internal ───────────────────────────────────────────────────────────────
    _getAllOrders() {
      try {
        return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
      } catch {
        return [];
      }
    }
  };

  window.SQCOrders = SQCOrders;
})();

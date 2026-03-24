// wishlist.js — SQC Wishlist Management (Supabase-backed)
// Falls back to localStorage for guests.
// Exports: window.SQCWishlist

(function () {
  'use strict';

  const LOCAL_KEY = 'sqc_wishlist';

  window.SQCWishlist = {

    // ── Get wishlist ───────────────────────────────────────────────────────────
    async getWishlist() {
      const user = await window.SQCAuth.getUser();
      if (!user) return this._localGet();

      const { data, error } = await window.sqc
        .from('wishlists')
        .select('product_id')
        .eq('user_id', user.id);

      if (error) return this._localGet();
      return (data || []).map(r => r.product_id);
    },

    // ── Is wishlisted? ─────────────────────────────────────────────────────────
    async isWishlisted(productId) {
      const list = await this.getWishlist();
      return list.includes(productId);
    },

    // ── Toggle ─────────────────────────────────────────────────────────────────
    async toggleWishlist(productId) {
      const user = await window.SQCAuth.getUser();

      if (!user) {
        // Guest: localStorage fallback
        const list = this._localGet();
        const idx = list.indexOf(productId);
        if (idx === -1) {
          list.push(productId);
          this._localSave(list);
          return true;
        } else {
          list.splice(idx, 1);
          this._localSave(list);
          return false;
        }
      }

      // Logged in: check if already wishlisted
      const { data: existing } = await window.sqc
        .from('wishlists')
        .select('product_id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();

      if (existing) {
        await window.sqc.from('wishlists').delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
        return false;
      } else {
        await window.sqc.from('wishlists').insert({
          user_id: user.id,
          product_id: productId
        });
        return true;
      }
    },

    // ── Clear all ──────────────────────────────────────────────────────────────
    async clear() {
      const user = await window.SQCAuth.getUser();
      if (user) {
        await window.sqc.from('wishlists').delete().eq('user_id', user.id);
      }
      localStorage.removeItem(LOCAL_KEY);
    },

    // ── Local fallback helpers ─────────────────────────────────────────────────
    _localGet() {
      try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
    },
    _localSave(list) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
    }
  };
})();

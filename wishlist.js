// wishlist.js — SQC Wishlist Management
// Exports: window.SQCWishlist

(function () {
  'use strict';

  const KEY = 'sqc_wishlist';

  const SQCWishlist = {
    getWishlist() {
      try {
        return JSON.parse(localStorage.getItem(KEY) || '[]');
      } catch {
        return [];
      }
    },

    saveWishlist(list) {
      localStorage.setItem(KEY, JSON.stringify(list));
    },

    isWishlisted(productId) {
      return this.getWishlist().includes(productId);
    },

    // Returns true if now wishlisted, false if removed
    toggleWishlist(productId) {
      const list = this.getWishlist();
      const idx = list.indexOf(productId);
      if (idx === -1) {
        list.push(productId);
        this.saveWishlist(list);
        return true;
      } else {
        list.splice(idx, 1);
        this.saveWishlist(list);
        return false;
      }
    },

    removeFromWishlist(productId) {
      const list = this.getWishlist().filter(id => id !== productId);
      this.saveWishlist(list);
    },

    clear() {
      localStorage.removeItem(KEY);
    }
  };

  window.SQCWishlist = SQCWishlist;
})();

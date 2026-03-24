// products.js — SQC Product Catalog (Supabase-backed)
// Replaces the old hardcoded array with live database queries.
// Exports: window.SQCProducts

(function () {
  'use strict';

  window.SQCProducts = {

    // Cache so we don't hammer the DB on every filter
    _cache: null,

    // ── Fetch all products ─────────────────────────────────────────────────────
    async getAll() {
      if (this._cache) return this._cache;

      const { data, error } = await window.sqc
        .from('products')
        .select('*')
        .eq('in_stock', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('SQCProducts.getAll error:', error.message);
        return [];
      }

      this._cache = this._normalize(data);
      return this._cache;
    },

    // ── Fetch featured products ───────────────────────────────────────────────
    async getFeatured() {
      const all = await this.getAll();
      return all.filter(p => p.featured);
    },

    // ── Fetch by category slug ────────────────────────────────────────────────
    async getByCategory(slug) {
      const all = await this.getAll();
      if (!slug || slug === 'all') return all;
      return all.filter(p => p.categorySlug === slug);
    },

    // ── Fetch single product ──────────────────────────────────────────────────
    async getById(id) {
      const all = await this.getAll();
      return all.find(p => p.id === id) || null;
    },

    // ── Map DB column names → camelCase used throughout the site ─────────────
    _normalize(rows) {
      return rows.map(r => ({
        id:           r.id,
        name:         r.name,
        category:     r.category,
        categorySlug: r.category_slug,
        price:        parseFloat(r.price),
        condition:    r.condition,
        image:        r.image_url || '',
        bg:           r.bg || 'linear-gradient(135deg, #1a1a2e 0%, #333366 100%)',
        emoji:        r.emoji || '🎮',
        badge:        r.badge || null,
        inStock:      r.in_stock,
        featured:     r.featured,
        description:  r.description || '',
        console:      r.console || null,
      }));
    },

    // ── Clear cache (call after admin adds/edits products) ────────────────────
    clearCache() {
      this._cache = null;
    }
  };
})();

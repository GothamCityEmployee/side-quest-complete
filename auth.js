// auth.js — SQC Customer Authentication (Supabase Auth)
// Exports: window.SQCAuth

(function () {
  'use strict';

  window.SQCAuth = {

    // ── Get current session ────────────────────────────────────────────────────
    async getSession() {
      const { data: { session } } = await window.sqc.auth.getSession();
      return session;
    },

    // ── Get current user ───────────────────────────────────────────────────────
    async getUser() {
      const { data: { user } } = await window.sqc.auth.getUser();
      return user;
    },

    // ── Convenience: is logged in? ─────────────────────────────────────────────
    async isLoggedIn() {
      const session = await this.getSession();
      return !!session;
    },

    // ── Get profile (points, display name) ────────────────────────────────────
    async getProfile(userId) {
      if (!userId) {
        const user = await this.getUser();
        if (!user) return null;
        userId = user.id;
      }
      const { data, error } = await window.sqc
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) return null;
      return data;
    },

    // ── Register ───────────────────────────────────────────────────────────────
    async register(name, email, password) {
      if (!name || !email || !password) {
        return { success: false, error: 'All fields are required.' };
      }

      const { data, error } = await window.sqc.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: { name: name.trim() }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
          name: name.trim(),
        }
      };
    },

    // ── Login ──────────────────────────────────────────────────────────────────
    async login(email, password) {
      if (!email || !password) {
        return { success: false, error: 'Email and password are required.' };
      }

      const { data, error } = await window.sqc.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        return { success: false, error: 'Invalid email or password.' };
      }

      const name = data.user?.user_metadata?.name || data.user?.email?.split('@')[0] || 'Friend';

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name,
        }
      };
    },

    // ── Logout ─────────────────────────────────────────────────────────────────
    async logout() {
      await window.sqc.auth.signOut();
    },

    // ── Update points ──────────────────────────────────────────────────────────
    async addPoints(userId, points) {
      if (!userId || !points) return;
      const profile = await this.getProfile(userId);
      const current = profile?.points || 0;
      await window.sqc
        .from('profiles')
        .update({ points: current + points })
        .eq('id', userId);
    }
  };
})();

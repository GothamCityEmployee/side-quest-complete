// auth.js — SQC Customer Authentication
// Exports: window.SQCAuth

(function () {
  'use strict';

  const USERS_KEY = 'sqc_users';
  const SESSION_KEY = 'sqc_session';

  const SQCAuth = {
    // ── Helpers ────────────────────────────────────────────────────────────────
    hashPassword(password) {
      return btoa(unescape(encodeURIComponent(password)));
    },

    getUsers() {
      try {
        return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      } catch {
        return [];
      }
    },

    saveUsers(users) {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    },

    // ── Register ───────────────────────────────────────────────────────────────
    register(name, email, password) {
      if (!name || !email || !password) {
        return { success: false, error: 'All fields are required.' };
      }
      const normalizedEmail = email.toLowerCase().trim();
      const users = this.getUsers();
      if (users.find(u => u.email === normalizedEmail)) {
        return { success: false, error: 'An account with that email already exists.' };
      }
      const user = {
        id: 'usr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        email: normalizedEmail,
        name: name.trim(),
        passwordHash: this.hashPassword(password),
        createdAt: new Date().toISOString(),
        points: 0,
        orderHistory: []
      };
      users.push(user);
      this.saveUsers(users);
      this._setSession(user, false);
      return { success: true, user: this._safeUser(user) };
    },

    // ── Login ──────────────────────────────────────────────────────────────────
    login(email, password, remember = false) {
      if (!email || !password) {
        return { success: false, error: 'Email and password are required.' };
      }
      const normalizedEmail = email.toLowerCase().trim();
      const users = this.getUsers();
      const user = users.find(u => u.email === normalizedEmail);
      if (!user) {
        return { success: false, error: 'No account found with that email.' };
      }
      if (user.passwordHash !== this.hashPassword(password)) {
        return { success: false, error: 'Incorrect password. Please try again.' };
      }
      this._setSession(user, remember);
      return { success: true, user: this._safeUser(user) };
    },

    // ── Logout ─────────────────────────────────────────────────────────────────
    logout() {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    },

    // ── Session ────────────────────────────────────────────────────────────────
    _setSession(user, persist) {
      const session = { userId: user.id, email: user.email, name: user.name };
      const serialized = JSON.stringify(session);
      sessionStorage.setItem(SESSION_KEY, serialized);
      if (persist) {
        localStorage.setItem(SESSION_KEY, serialized);
      }
    },

    getCurrentUser() {
      try {
        const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const session = JSON.parse(raw);
        const users = this.getUsers();
        return users.find(u => u.id === session.userId) || null;
      } catch {
        return null;
      }
    },

    isLoggedIn() {
      return this.getCurrentUser() !== null;
    },

    // ── User Updates ───────────────────────────────────────────────────────────
    updateUser(userId, updates) {
      const users = this.getUsers();
      const idx = users.findIndex(u => u.id === userId);
      if (idx === -1) return null;
      // Never allow overwriting passwordHash or id via this method
      const { id, passwordHash, ...safeUpdates } = updates;
      users[idx] = { ...users[idx], ...safeUpdates };
      this.saveUsers(users);
      return this._safeUser(users[idx]);
    },

    // ── Points & Tiers ─────────────────────────────────────────────────────────
    getTier(points) {
      if (points >= 1000) {
        return { name: 'Platinum', color: '#b03af5', discount: 0.15, next: null, nextPoints: null, min: 1000 };
      }
      if (points >= 500) {
        return { name: 'Gold', color: '#ffd700', discount: 0.10, next: 'Platinum', nextPoints: 1000, min: 500 };
      }
      if (points >= 100) {
        return { name: 'Silver', color: '#c0c0c0', discount: 0.05, next: 'Gold', nextPoints: 500, min: 100 };
      }
      return { name: 'Bronze', color: '#cd7f32', discount: 0, next: 'Silver', nextPoints: 100, min: 0 };
    },

    awardPoints(userId, dollarAmount) {
      const points = Math.round(dollarAmount);
      if (points <= 0) return 0;
      const users = this.getUsers();
      const idx = users.findIndex(u => u.id === userId);
      if (idx === -1) return 0;
      users[idx].points = (users[idx].points || 0) + points;
      this.saveUsers(users);
      return points;
    },

    // ── Internal ───────────────────────────────────────────────────────────────
    _safeUser(user) {
      const { passwordHash, ...safe } = user;
      return safe;
    }
  };

  window.SQCAuth = SQCAuth;
})();

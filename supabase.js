// supabase.js — Supabase client for Side Quest Complete
// Must be loaded FIRST before auth.js, products.js, orders.js, wishlist.js

const SQC_SUPABASE_URL = 'https://qlsedglhrxvkvlafviin.supabase.co';
const SQC_SUPABASE_KEY = 'sb_publishable_3R0PK5Ucrdr_6DKLZ4ArZg_-XQd66WJ';

// Load Supabase SDK from CDN
(function () {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
  script.async = false;
  document.head.appendChild(script);
})();

// Wait for SDK then expose window.sqc
function initSQCClient() {
  if (typeof window.supabase === 'undefined') {
    setTimeout(initSQCClient, 50);
    return;
  }
  window.sqc = window.supabase.createClient(SQC_SUPABASE_URL, SQC_SUPABASE_KEY);
  window.dispatchEvent(new Event('sqc:ready'));
}

document.addEventListener('DOMContentLoaded', initSQCClient);

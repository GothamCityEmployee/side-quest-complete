module.exports = async function handler(req, res) {
  try {
    require('square');
    require('@supabase/supabase-js');
    return res.status(200).json({ ok: true, square: 'found', supabase: 'found' });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};

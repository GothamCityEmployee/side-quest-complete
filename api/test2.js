module.exports = async function handler(req, res) {
  try {
    const { Client, Environment } = require('square');
    const { createClient } = require('@supabase/supabase-js');

    const square = new Client({
      accessToken: process.env.SQUARE_ACCESS_TOKEN,
      environment: process.env.SQUARE_ENV === 'production' ? Environment.Production : Environment.Sandbox,
    });

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    return res.status(200).json({
      ok: true,
      squareEnv: process.env.SQUARE_ENV,
      hasToken: !!process.env.SQUARE_ACCESS_TOKEN,
      hasSupabase: !!process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasResend: !!process.env.RESEND_API_KEY,
    });
  } catch(e) {
    return res.status(500).json({ error: e.message, stack: e.stack?.slice(0,500) });
  }
};

module.exports = async function handler(req, res) {
  const token = process.env.SQUARE_ACCESS_TOKEN || '';
  const env = process.env.SQUARE_ENV || '';
  const appId = process.env.SQUARE_APP_ID || '';
  const locationId = process.env.SQUARE_LOCATION_ID || '';

  // Test the token against Square API
  let squareTest = 'not tested';
  try {
    const r = await fetch('https://connect.squareup.com/v2/merchants/me', {
      headers: { 'Authorization': `Bearer ${token}`, 'Square-Version': '2024-01-18' }
    });
    const d = await r.json();
    squareTest = d.merchant ? `OK - ${d.merchant.business_name}` : JSON.stringify(d);
  } catch(e) { squareTest = e.message; }

  return res.status(200).json({
    env,
    appId: appId.slice(0, 10) + '...',
    token: token.slice(0, 10) + '...' + token.slice(-4),
    locationId,
    squareTest,
  });
};

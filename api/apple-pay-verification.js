const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  const filePath = path.join(process.cwd(), '.well-known', 'apple-developer-merchantid-domain-association');
  const content = fs.readFileSync(filePath, 'utf8');
  const parsed = JSON.parse(content);
  // Use res.json() so Vercel sets content-type: application/json automatically
  res.status(200).json(parsed);
};

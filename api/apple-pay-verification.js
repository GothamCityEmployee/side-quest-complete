// Serves the Apple Pay domain verification file without compression
const fs = require('fs');
const path = require('path');

module.exports = function handler(req, res) {
  const filePath = path.join(process.cwd(), '.well-known', 'apple-developer-merchantid-domain-association');
  const content = fs.readFileSync(filePath, 'utf8');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Encoding', 'identity');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).send(content);
};

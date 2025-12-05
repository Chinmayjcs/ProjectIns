/**
 * server.js
 * Simple Express API for password checking and generation.
 *
 * Endpoints:
 * POST /api/check-password   -> { password }  -> { success, result: { score, label, breakdown } }
 * POST /api/generate-password -> { length } -> { success, password }
 *
 * Optional MongoDB logging (masked passwords) when ENABLE_LOG=true and MONGO_URI provided.
 */

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;
const ENABLE_LOG = (process.env.ENABLE_LOG || 'false').toLowerCase() === 'true';
const MONGO_URI = process.env.MONGO_URI || '';

let dbClient = null;
if (ENABLE_LOG && MONGO_URI) {
  const { MongoClient } = require('mongodb');
  MongoClient.connect(MONGO_URI, { useUnifiedTopology: true })
    .then(client => {
      dbClient = client;
      console.log('Connected to MongoDB for optional logging.');
    })
    .catch(err => {
      console.error('MongoDB connect failed:', err.message);
    });
}

// Mask password for logs — keep first and last char visible if possible
function maskPwd(pw) {
  if (!pw) return '';
  if (pw.length <= 2) return '*'.repeat(pw.length);
  return pw[0] + '*'.repeat(pw.length - 2) + pw[pw.length - 1];
}

// Scoring algorithm (0 - 100)
function scorePassword(password) {
  const result = {
    score: 0,
    breakdown: {},
    label: ''
  };

  if (!password || typeof password !== 'string') {
    result.score = 0;
    result.label = 'Invalid';
    return result;
  }

  const len = password.length;

  if (len < 6) {
    result.score = 0;
    result.breakdown.lengthScore = 0;
    result.label = 'Too short (min 6)';
    return result;
  }

  // Length score: linear from 6 -> 12+ mapped to 0..25
  const lengthScore = Math.min(25, Math.round(((Math.min(len, 12) - 6) / 6) * 25));
  result.breakdown.lengthScore = lengthScore;

  // Upper + lower
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  let caseScore = 0;
  if (hasLower && hasUpper) caseScore = 15;
  else if (hasLower || hasUpper) caseScore = 7;
  result.breakdown.caseScore = caseScore;

  // Digit
  const hasDigit = /\d/.test(password);
  const digitScore = hasDigit ? 20 : 0;
  result.breakdown.digitScore = digitScore;

  // Symbol
  const hasSymbol = /[!@#\$%\^&\*\(\)\-_=+\[\]{};:'",.<>\/\?\\|`~]/.test(password);
  const symbolScore = hasSymbol ? 20 : 0;
  result.breakdown.symbolScore = symbolScore;

  // Pattern checks (common sequences or dictionary-like words)
  const lowered = password.toLowerCase();
  const commonPatterns = ['123', '1234', '12345', '123456', 'password', 'qwerty', 'abc', 'letmein', 'admin', 'welcome', 'iloveyou'];
  const containsCommon = commonPatterns.some(p => lowered.includes(p));
  const repeatedChars = /(.)\1\1/.test(password); // three repeated chars
  const patternScore = (containsCommon || repeatedChars) ? 0 : 20;
  result.breakdown.patternScore = patternScore;
  result.breakdown.containsCommon = containsCommon;
  result.breakdown.repeatedChars = repeatedChars;

  const total = lengthScore + caseScore + digitScore + symbolScore + patternScore;
  result.score = Math.min(100, total);

  // Label
  if (result.score >= 85) result.label = 'Very Strong';
  else if (result.score >= 65) result.label = 'Strong';
  else if (result.score >= 40) result.label = 'Medium';
  else result.label = 'Weak';

  return result;
}

// POST /api/check-password
app.post('/api/check-password', async (req, res) => {
  const { password } = req.body;
  const outcome = scorePassword(password);

  // optional logging (masked)
  if (ENABLE_LOG && dbClient) {
    try {
      const db = dbClient.db(); // default db from URI
      await db.collection('pw_checks').insertOne({
        ts: new Date(),
        masked: maskPwd(password),
        score: outcome.score,
        label: outcome.label
      });
    } catch (err) {
      console.error('Log write failed:', err.message);
    }
  }

  res.json({ success: true, result: outcome });
});

// POST /api/generate-password
app.post('/api/generate-password', (req, res) => {
  const { length } = req.body;
  const n = parseInt(length, 10);
  if (Number.isNaN(n) || n < 6) {
    return res.status(400).json({ success: false, message: 'Length must be an integer >= 6' });
  }

  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,.<>/?`~';
  const bytes = crypto.randomBytes(n);
  let password = '';
  for (let i = 0; i < n; i++) {
    const idx = bytes[i] % charset.length;
    password += charset.charAt(idx);
  }

  res.json({ success: true, password });
});

app.listen(PORT, () => {
  console.log(`Password Analyzer API running on port ${PORT}`);
});

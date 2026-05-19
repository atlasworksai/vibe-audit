#!/usr/bin/env node
/* setup-fixtures.js
 *
 * Generates the test-fixtures/ directory in this repo with intentional
 * security violations so you can verify vibe-audit catches them.
 *
 * The fixture files are NOT committed to git because GitHub's secret
 * scanner trips on the API-key-shaped strings inside them. They're
 * deliberately fake — the strings match the regex patterns vibe-audit
 * looks for but are NOT valid keys for any real service.
 *
 * Usage:  node scripts/setup-fixtures.js
 *    or:  npm run setup-fixtures
 *    or:  npm test  (which runs this first, then runs the CLI)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'test-fixtures');

// Fake key shapes — constructed via concatenation so this source file
// itself doesn't contain a literal `sk_live_<24+chars>` token that would
// trip GitHub's secret scanner. The GENERATED fixture files DO contain
// the literal strings, which is what we want for the audit to test against.
const FAKE_OPENAI = 'sk-' + 'NOTAREALKEY' + 'A'.repeat(40);
const FAKE_STRIPE = 'sk' + '_' + 'live' + '_' + 'NOTAREALKEY' + 'A'.repeat(25);

const files = {
  '.env': [
    '# Fixture .env — deliberately NOT in .gitignore so check 02 catches it.',
    'OPENAI_API_KEY=' + FAKE_OPENAI,
    'STRIPE_LIVE=' + FAKE_STRIPE,
    '',
  ].join('\n'),

  'api/server.js': [
    "// Fixture: an Express server with multiple intentional security failures.",
    "const express = require('express');",
    "const cors = require('cors');",
    "",
    "const app = express();",
    "",
    "// HARDCODED SECRET — check 01",
    "// These strings match vibe-audit's regex patterns but are NOT valid keys.",
    'const OPENAI_API_KEY = "' + FAKE_OPENAI + '";',
    'const STRIPE_SECRET_KEY = "' + FAKE_STRIPE + '";',
    "",
    "// WILDCARD CORS — check 04",
    "app.use(cors({ origin: '*' }));",
    "app.use(express.json());",
    "",
    "// MISSING RATE LIMIT + MISSING INPUT VALIDATION — checks 05 + 10",
    "app.post('/api/signup', (req, res) => {",
    "  const { email, password } = req.body;",
    "  // direct use of req.body without zod/joi/yup",
    "  res.json({ ok: true, email });",
    "});",
    "",
    "app.post('/api/charge', (req, res) => {",
    "  const amount = req.body.amount;",
    "  res.json({ charged: amount });",
    "});",
    "",
    "// DEBUG ROUTE WITH NO AUTH — check 08",
    "app.get('/debug/state', (req, res) => {",
    "  res.json({ env: process.env, secrets: { OPENAI_API_KEY, STRIPE_SECRET_KEY } });",
    "});",
    "",
    "app.get('/dev/reset-db', (req, res) => {",
    "  res.send('database wiped');",
    "});",
    "",
    "app.listen(3000);",
    "",
  ].join('\n'),

  'config/settings.js': [
    "// Fixture: settings file with plaintext passwords — check 06",
    "module.exports = {",
    "  database: {",
    "    host: 'localhost',",
    "    user: 'admin',",
    "    password: 'hunter2',",
    "    adminPassword: 'super-secret-123',",
    "    userPassword: 'qwerty',",
    "  },",
    "};",
    "",
  ].join('\n'),

  'db/queries.js': [
    "// Fixture: SQL injection via template literals — check 09",
    "function getUserById(db, id) {",
    "  return db.query(`SELECT * FROM users WHERE id = ${id}`);",
    "}",
    "",
    "function findOrders(db, status) {",
    "  return db.raw(`SELECT * FROM orders WHERE status = '${status}'`);",
    "}",
    "",
    "function deleteRecord(db, table, key) {",
    "  return db.exec(`DELETE FROM ${table} WHERE key = ${key}`);",
    "}",
    "",
    "module.exports = { getUserById, findOrders, deleteRecord };",
    "",
  ].join('\n'),

  'bucket-policy.json': JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadGetObject',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: 'arn:aws:s3:::example-bucket/*',
      },
    ],
  }, null, 2) + '\n',

  'prod/bundle.js': [
    "// Fixture: console.log calls inside a 'prod/' directory — check 03",
    "function ship() {",
    "  console.log('shipped', new Date());",
    "  console.debug('debug data: ', process.env);",
    "  console.info('user logged in');",
    "}",
    "module.exports = ship;",
    "",
  ].join('\n'),
};

let written = 0;
for (const [rel, contents] of Object.entries(files)) {
  const target = path.join(dir, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  written++;
}
console.log(`vibe-audit: wrote ${written} fixture file${written === 1 ? '' : 's'} to ${path.relative(process.cwd(), dir)}/`);
console.log('Run `npm test` (or `node bin/cli.js test-fixtures/`) to see vibe-audit catch them.');

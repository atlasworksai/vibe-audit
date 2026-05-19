'use strict';

const path = require('path');

const PATTERNS = [
  { re: /sk-[a-zA-Z0-9]{20,}/g,                          label: 'OpenAI-style API key (sk-…)' },
  { re: /sk-ant-[a-zA-Z0-9_-]{20,}/g,                    label: 'Anthropic API key (sk-ant-…)' },
  { re: /AKIA[0-9A-Z]{16}/g,                             label: 'AWS access key ID' },
  { re: /aws_secret_access_key\s*=\s*['"][A-Za-z0-9/+=]{20,}['"]/gi, label: 'AWS secret access key assignment' },
  { re: /AIza[0-9A-Za-z_-]{20,}/g,                       label: 'Google API key' },
  { re: /ghp_[A-Za-z0-9]{20,}/g,                         label: 'GitHub personal access token' },
  { re: /xox[abpr]-[A-Za-z0-9-]{10,}/g,                  label: 'Slack token' },
  { re: /OPENAI_API_KEY\s*=\s*['"][^'"\s]{8,}['"]/g,     label: 'OPENAI_API_KEY hardcoded assignment' },
  { re: /STRIPE_SECRET(?:_KEY)?\s*=\s*['"][^'"\s]{8,}['"]/gi, label: 'STRIPE_SECRET hardcoded assignment' },
  { re: /sk_live_[A-Za-z0-9]{20,}/g,                     label: 'Stripe live secret key' },
  { re: /SUPABASE_SERVICE_ROLE(?:_KEY)?\s*=\s*['"][^'"\s]{8,}['"]/gi, label: 'Supabase service role key' },
];

function run(filepath, contents) {
  // .env files are EXPECTED to hold secrets — skip them here. (Check 02 handles them.)
  const base = path.basename(filepath);
  if (base === '.env' || base.startsWith('.env.')) return [];

  const findings = [];
  const lines = contents.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const p of PATTERNS) {
      p.re.lastIndex = 0;
      let m;
      while ((m = p.re.exec(line)) !== null) {
        findings.push({
          file: filepath,
          line: i + 1,
          col: m.index + 1,
          message: `Hardcoded secret: ${p.label}`,
        });
      }
    }
  }
  return findings;
}

module.exports = {
  id: '01',
  name: 'hardcoded-secrets',
  severity: 'HIGH',
  run,
};

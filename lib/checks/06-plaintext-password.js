'use strict';

// Match: const password = "foo", let userPassword = 'bar', this.passwd = "x", password: "y"
const ASSIGN_RE = /\b(?:const|let|var|this\.)?\s*([a-zA-Z_$][\w$]*)?\s*[:=]\s*(['"])([^'"\n]{3,})\2/g;
const NAME_RE = /^(?:user|admin|db|root)?[Pp]ass(?:word|wd)?$|^[Pp]assword$|^[Pp]asswd$|^userPassword$|^adminPassword$/;
const SAFE_RE = /\b(hash|bcrypt|argon|argon2|scrypt|pbkdf2?|sha\d+|md5)\b/i;
const PLACEHOLDER_RE = /^(?:\*+|x+|change[- ]?me|placeholder|todo|fixme|<.*>)$/i;

function run(filepath, contents) {
  if (!/\.(js|jsx|ts|tsx|mjs|cjs|json|yaml|yml|env)$/i.test(filepath)) return [];
  if (filepath.endsWith('.env') || /\.env\./.test(filepath)) return [];

  const findings = [];
  const lines = contents.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Quick line-scoped scan: find "<name> = 'value'" or "<name>: 'value'"
    const lineRe = /([a-zA-Z_$][\w$]*)\s*[:=]\s*(['"])([^'"\n]{3,})\2/g;
    let m;
    while ((m = lineRe.exec(line)) !== null) {
      const name = m[1];
      const value = m[3];
      if (!NAME_RE.test(name)) continue;
      if (SAFE_RE.test(value) || SAFE_RE.test(line)) continue;
      if (PLACEHOLDER_RE.test(value)) continue;
      // Skip env-var references like password: process.env.X — value won't be a literal in that case anyway.
      findings.push({
        file: filepath,
        line: i + 1,
        col: m.index + 1,
        message: `Plaintext password literal in '${name}' — should be hashed (bcrypt/argon2/scrypt) or pulled from env.`,
      });
    }
  }
  return findings;
}

module.exports = {
  id: '06',
  name: 'plaintext-password',
  severity: 'HIGH',
  run,
};

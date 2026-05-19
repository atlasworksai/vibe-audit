'use strict';

const SQL_KW = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|WHERE|FROM|INTO)\b/i;
const TEMPLATE_RE = /`([^`]*)`/g;

function run(filepath, contents) {
  if (!/\.(js|jsx|ts|tsx|mjs|cjs)$/i.test(filepath)) return [];

  const findings = [];
  TEMPLATE_RE.lastIndex = 0;
  let m;
  while ((m = TEMPLATE_RE.exec(contents)) !== null) {
    const body = m[1];
    if (!SQL_KW.test(body)) continue;
    if (!/\$\{[^}]+\}/.test(body)) continue;

    const idx = m.index;
    const before = contents.slice(0, idx);
    const line = before.split(/\r?\n/).length;
    const lastNl = before.lastIndexOf('\n');
    const col = idx - lastNl;
    findings.push({
      file: filepath,
      line,
      col,
      message: 'SQL via template literal with interpolation — use parameterized queries (? or $1) to prevent SQL injection.',
    });
  }
  return findings;
}

module.exports = {
  id: '09',
  name: 'sql-injection',
  severity: 'HIGH',
  run,
};

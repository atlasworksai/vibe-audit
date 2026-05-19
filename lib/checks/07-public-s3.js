'use strict';

const PRINCIPAL_RE = /["']Principal["']\s*:\s*["']\*["']/g;
const PRINCIPAL_AWS_RE = /["']Principal["']\s*:\s*\{\s*["']AWS["']\s*:\s*["']\*["']\s*\}/g;

function run(filepath, contents) {
  if (!/\.(json|js|jsx|ts|tsx|yaml|yml|tf)$/i.test(filepath)) return [];

  const findings = [];
  const checks = [
    { re: PRINCIPAL_RE,     label: '"Principal": "*"' },
    { re: PRINCIPAL_AWS_RE, label: '"Principal": { "AWS": "*" }' },
  ];

  for (const c of checks) {
    c.re.lastIndex = 0;
    let m;
    while ((m = c.re.exec(contents)) !== null) {
      const idx = m.index;
      const before = contents.slice(0, idx);
      const line = before.split(/\r?\n/).length;
      const lastNl = before.lastIndexOf('\n');
      const col = idx - lastNl;
      findings.push({
        file: filepath,
        line,
        col,
        message: `Public bucket/resource policy: ${c.label} — anyone on the internet has access.`,
      });
    }
  }
  return findings;
}

module.exports = {
  id: '07',
  name: 'public-s3',
  severity: 'HIGH',
  run,
};

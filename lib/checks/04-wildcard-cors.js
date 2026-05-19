'use strict';

const PATTERNS = [
  { re: /Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*['"]/g, label: "Access-Control-Allow-Origin: '*'" },
  { re: /cors\s*\(\s*\{[^}]*origin\s*:\s*['"]\*['"]/gs,           label: "cors({ origin: '*' })" },
  { re: /cors\s*\(\s*\{[^}]*origin\s*:\s*true\b/gs,               label: 'cors({ origin: true }) — reflects any origin' },
  { re: /res\.setHeader\s*\(\s*['"]Access-Control-Allow-Origin['"]\s*,\s*['"]\*['"]\s*\)/g, label: "setHeader Access-Control-Allow-Origin '*'" },
];

function run(filepath, contents) {
  if (!/\.(js|jsx|ts|tsx|mjs|cjs)$/i.test(filepath)) return [];

  const findings = [];
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    let m;
    while ((m = p.re.exec(contents)) !== null) {
      const idx = m.index;
      const before = contents.slice(0, idx);
      const line = before.split(/\r?\n/).length;
      const lastNl = before.lastIndexOf('\n');
      const col = idx - lastNl;
      findings.push({
        file: filepath,
        line,
        col,
        message: `Wildcard CORS: ${p.label} — any origin can call this API.`,
      });
    }
  }
  return findings;
}

module.exports = {
  id: '04',
  name: 'wildcard-cors',
  severity: 'HIGH',
  run,
};

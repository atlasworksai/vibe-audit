'use strict';

const path = require('path');

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  gray: '\x1b[90m',
};

function color(c, s) {
  if (!process.stdout.isTTY && !process.env.FORCE_COLOR) return s;
  return c + s + C.reset;
}

function sevColor(sev) {
  if (sev === 'HIGH') return C.red;
  if (sev === 'MEDIUM') return C.yellow;
  return C.cyan;
}

function report(findings, files, opts) {
  const root = opts.root || process.cwd();

  if (opts.json) {
    const payload = {
      filesScanned: files.length,
      findings: findings.map(f => ({
        checkId: f.checkId,
        checkName: f.checkName,
        severity: f.severity,
        file: path.relative(root, f.file),
        line: f.line,
        col: f.col,
        message: f.message,
      })),
      summary: tally(findings),
    };
    console.log(JSON.stringify(payload, null, 2));
    return findings.some(f => f.severity === 'HIGH') ? 1 : 0;
  }

  if (findings.length === 0) {
    console.log(color(C.green, '✓ vibe-audit: no issues found across ' + files.length + ' files.'));
    return 0;
  }

  // Group by file for readability
  const byFile = {};
  for (const f of findings) {
    const rel = path.relative(root, f.file);
    (byFile[rel] = byFile[rel] || []).push(f);
  }

  console.log('');
  console.log(color(C.bold, 'vibe-audit findings:'));
  console.log('');

  const sortedFiles = Object.keys(byFile).sort();
  for (const rel of sortedFiles) {
    console.log(color(C.bold, rel));
    const items = byFile[rel].sort((a, b) => (a.line || 0) - (b.line || 0));
    for (const f of items) {
      const sev = color(sevColor(f.severity), `[${f.severity}]`);
      const loc = color(C.gray, `${f.line || '?'}:${f.col || '?'}`);
      const cid = color(C.dim, `(${f.checkId})`);
      console.log(`  ${sev} ${loc} ${f.message} ${cid}`);
    }
    console.log('');
  }

  const t = tally(findings);
  const summary = `${findings.length} issues found across ${Object.keys(byFile).length} files (` +
    color(C.red, `${t.high} high`) + ', ' +
    color(C.yellow, `${t.medium} medium`) + ', ' +
    color(C.cyan, `${t.low} low`) + ').';
  console.log(summary);

  return t.high > 0 ? 1 : 0;
}

function tally(findings) {
  const t = { high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    if (f.severity === 'HIGH') t.high++;
    else if (f.severity === 'MEDIUM') t.medium++;
    else t.low++;
  }
  return t;
}

module.exports = { report, tally };

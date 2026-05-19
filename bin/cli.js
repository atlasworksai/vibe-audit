#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { walk } = require('../lib/walker');
const { report } = require('../lib/reporter');

const checks = [
  require('../lib/checks/01-hardcoded-secrets'),
  require('../lib/checks/02-exposed-env'),
  require('../lib/checks/03-console-log-prod'),
  require('../lib/checks/04-wildcard-cors'),
  require('../lib/checks/05-missing-input-validation'),
  require('../lib/checks/06-plaintext-password'),
  require('../lib/checks/07-public-s3'),
  require('../lib/checks/08-debug-routes'),
  require('../lib/checks/09-sql-injection'),
  require('../lib/checks/10-missing-rate-limit'),
];

function parseArgs(argv) {
  const args = { path: '.', json: false, help: false };
  for (const a of argv) {
    if (a === '--json') args.json = true;
    else if (a === '-h' || a === '--help') args.help = true;
    else if (!a.startsWith('-')) args.path = a;
  }
  return args;
}

function printHelp() {
  console.log(`vibe-audit — scan AI-generated code for common security failures

Usage:
  npx vibe-audit [path]       Scan the given directory (default: .)
  npx vibe-audit --json       Output findings as JSON
  npx vibe-audit -h           Show this help

Checks:
${checks.map(c => `  ${c.id.padEnd(4)} ${c.severity.padEnd(7)} ${c.name}`).join('\n')}
`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const root = path.resolve(args.path);
  if (!fs.existsSync(root)) {
    console.error(`vibe-audit: path not found: ${root}`);
    process.exit(2);
  }

  const files = walk(root);
  const findings = [];

  // File-list-level checks (e.g. exposed .env) get the file list once.
  for (const check of checks) {
    if (check.runOnFileList) {
      const out = check.runOnFileList(files, root) || [];
      findings.push(...out.map(f => ({ ...f, checkId: check.id, severity: check.severity, checkName: check.name })));
    }
  }

  // Per-file checks
  for (const file of files) {
    let contents;
    try {
      const stat = fs.statSync(file);
      if (stat.size > 2 * 1024 * 1024) continue; // skip files >2MB
      contents = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const check of checks) {
      if (typeof check.run !== 'function') continue;
      try {
        const out = check.run(file, contents, root) || [];
        for (const f of out) {
          findings.push({
            ...f,
            checkId: check.id,
            severity: check.severity,
            checkName: check.name,
          });
        }
      } catch (e) {
        // A broken check shouldn't kill the whole run.
        if (process.env.VIBE_AUDIT_DEBUG) {
          console.error(`check ${check.id} threw on ${file}: ${e.message}`);
        }
      }
    }
  }

  const exitCode = report(findings, files, { json: args.json, root });
  process.exit(exitCode);
}

main();

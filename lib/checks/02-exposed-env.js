'use strict';

const fs = require('fs');
const path = require('path');
const { parseGitignore } = require('../walker');

const ENV_NAMES = new Set(['.env', '.env.local', '.env.production', '.env.development', '.env.staging']);

function isIgnored(rel, patterns) {
  for (const pat of patterns) {
    const clean = pat.replace(/^\//, '').replace(/\/$/, '');
    if (clean === '.env' || clean === '.env.*' || clean === '.env*') {
      if (rel.startsWith('.env')) return true;
    }
    if (clean === path.basename(rel)) return true;
    if (clean.includes('*')) {
      const re = new RegExp('^' + clean.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      if (re.test(path.basename(rel))) return true;
    }
  }
  return false;
}

function runOnFileList(files, root) {
  const findings = [];
  const patterns = parseGitignore(root);

  for (const file of files) {
    const base = path.basename(file);
    const rel = path.relative(root, file);
    if (!base.startsWith('.env')) continue;

    if (!isIgnored(rel, patterns)) {
      findings.push({
        file,
        line: 1,
        col: 1,
        message: `Env file '${rel}' is NOT in .gitignore — secrets will be committed.`,
      });
    }

    // Nested .env (anywhere but root)
    const dir = path.dirname(rel);
    if (dir !== '.' && dir !== '') {
      findings.push({
        file,
        line: 1,
        col: 1,
        message: `Nested env file at '${rel}' — usually a mistake; secrets should live at project root only.`,
      });
    }
  }
  return findings;
}

module.exports = {
  id: '02',
  name: 'exposed-env',
  severity: 'HIGH',
  runOnFileList,
};

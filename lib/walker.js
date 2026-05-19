'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next',
  'coverage', '.nuxt', '.turbo', '.cache', '.parcel-cache',
  'out', '__pycache__', '.venv', 'venv', '.mypy_cache',
]);

function parseGitignore(rootDir) {
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (!fs.existsSync(gitignorePath)) return [];
  const lines = fs.readFileSync(gitignorePath, 'utf8').split(/\r?\n/);
  return lines
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => l.replace(/^\//, '').replace(/\/$/, ''));
}

function matchesGitignore(relPath, patterns) {
  // Simple matcher: treat patterns as either literal segments or glob-ish endings.
  // Good enough for the common cases (node_modules, *.log, .env, dist).
  for (const pat of patterns) {
    if (pat.includes('*')) {
      const re = new RegExp('^' + pat.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      const base = path.basename(relPath);
      if (re.test(base) || re.test(relPath)) return true;
    } else {
      const parts = relPath.split(path.sep);
      if (parts.includes(pat) || path.basename(relPath) === pat) return true;
    }
  }
  return false;
}

function walk(rootDir) {
  const gitignorePatterns = parseGitignore(rootDir);
  const out = [];

  function recurse(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(rootDir, full);
      if (entry.isDirectory()) {
        if (DEFAULT_SKIP_DIRS.has(entry.name)) continue;
        if (matchesGitignore(rel, gitignorePatterns)) continue;
        recurse(full);
      } else if (entry.isFile()) {
        // Don't skip .env in walk — checks need to see it. But skip very large binaries.
        if (matchesGitignore(rel, gitignorePatterns) && entry.name !== '.env' && !entry.name.startsWith('.env')) {
          continue;
        }
        out.push(full);
      }
    }
  }

  recurse(rootDir);
  return out;
}

module.exports = { walk, parseGitignore, matchesGitignore };

'use strict';

const PROD_PATH_RE = /[\/\\](dist|build|prod|\.next|out)[\/\\]/i;
const LOG_RE = /\bconsole\.(log|debug|info)\s*\(/g;

function run(filepath, contents) {
  if (!PROD_PATH_RE.test(filepath)) return [];
  if (!/\.(js|jsx|ts|tsx|mjs|cjs)$/i.test(filepath)) return [];

  const findings = [];
  const lines = contents.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    LOG_RE.lastIndex = 0;
    let m;
    while ((m = LOG_RE.exec(lines[i])) !== null) {
      findings.push({
        file: filepath,
        line: i + 1,
        col: m.index + 1,
        message: `console.${m[1]}() in build output — may leak data and bloats bundle.`,
      });
    }
  }
  return findings;
}

module.exports = {
  id: '03',
  name: 'console-log-in-prod',
  severity: 'MEDIUM',
  run,
};

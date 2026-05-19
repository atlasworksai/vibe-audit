'use strict';

const HANDLER_RE = /\b(?:app|router)\.(post|put|patch|delete)\s*\(/g;
const BODY_USE_RE = /\breq\.body\b/;
const VALIDATOR_IMPORT_RE = /\b(?:require|from|import)\b[^;]*\b(zod|joi|yup|ajv|class-validator|express-validator)\b/;

function run(filepath, contents) {
  if (!/\.(js|jsx|ts|tsx|mjs|cjs)$/i.test(filepath)) return [];
  if (!BODY_USE_RE.test(contents)) return [];
  if (VALIDATOR_IMPORT_RE.test(contents)) return [];

  const findings = [];
  HANDLER_RE.lastIndex = 0;
  let m;
  while ((m = HANDLER_RE.exec(contents)) !== null) {
    const idx = m.index;
    const before = contents.slice(0, idx);
    const line = before.split(/\r?\n/).length;
    const lastNl = before.lastIndexOf('\n');
    const col = idx - lastNl;
    findings.push({
      file: filepath,
      line,
      col,
      message: `${m[0]}…) handler uses req.body without a schema validator (zod/joi/yup/ajv).`,
    });
  }
  return findings;
}

module.exports = {
  id: '05',
  name: 'missing-input-validation',
  severity: 'MEDIUM',
  run,
};

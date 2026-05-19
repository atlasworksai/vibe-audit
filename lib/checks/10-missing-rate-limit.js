'use strict';

const HANDLER_RE = /\b(?:app|router)\.(post|put|patch|delete)\s*\(/g;
const LIMITER_RE = /\b(rateLimit|express-rate-limit|slowDown|express-slow-down|RateLimiterMemory|RateLimiterRedis|limiter)\b/;
const EXPRESS_HINT_RE = /\b(express|fastify|hono|koa)\b/;

function run(filepath, contents) {
  if (!/\.(js|jsx|ts|tsx|mjs|cjs)$/i.test(filepath)) return [];
  if (!EXPRESS_HINT_RE.test(contents)) return [];
  if (LIMITER_RE.test(contents)) return [];

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
      message: `${m[0]}…) write handler with no rate limiter visible in file — vulnerable to abuse/spam.`,
    });
  }
  return findings;
}

module.exports = {
  id: '10',
  name: 'missing-rate-limit',
  severity: 'MEDIUM',
  run,
};

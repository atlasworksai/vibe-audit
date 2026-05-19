'use strict';

const DEBUG_PATHS = /['"`](\/(?:debug|_internal|internal|admin\/debug|dev|test-endpoint|__test__|__admin__)[^'"`]*)['"`]/;
const ROUTE_RE = /\b(?:app|router)\.(get|post|put|patch|delete|use|all)\s*\(\s*['"`]([^'"`]+)['"`]/g;
const PY_ROUTE_RE = /@(?:app|bp|blueprint)\.(?:route|get|post|put|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
const AUTH_RE = /\b(authMiddleware|requireAuth|isAuthenticated|jwt\.verify|verifyToken|ensureAuth|protect|auth\(\)|@login_required)\b/;

function isDebugPath(p) {
  return /^\/(debug|_internal|internal|admin\/debug|dev|test-endpoint|__test__|__admin__)\b/.test(p);
}

function run(filepath, contents) {
  if (!/\.(js|jsx|ts|tsx|mjs|cjs|py)$/i.test(filepath)) return [];

  const hasAuth = AUTH_RE.test(contents);
  const findings = [];

  function scan(re, isPython) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(contents)) !== null) {
      const routePath = isPython ? m[1] : m[2];
      if (!isDebugPath(routePath)) continue;
      if (hasAuth) continue;
      const idx = m.index;
      const before = contents.slice(0, idx);
      const line = before.split(/\r?\n/).length;
      const lastNl = before.lastIndexOf('\n');
      const col = idx - lastNl;
      findings.push({
        file: filepath,
        line,
        col,
        message: `Debug route '${routePath}' with no visible auth middleware — exposed to the world.`,
      });
    }
  }

  scan(ROUTE_RE, false);
  scan(PY_ROUTE_RE, true);
  return findings;
}

module.exports = {
  id: '08',
  name: 'debug-routes-no-auth',
  severity: 'MEDIUM',
  run,
};

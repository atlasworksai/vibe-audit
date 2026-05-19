# vibe-audit

I was tired of GPT writing me code that hardcoded my OpenAI key.

`vibe-audit` is a zero-config CLI that scans a codebase for ten common security failures that show up in AI-generated code. No SaaS, no signup, no API key. Just run it.

## Usage

```bash
npx vibe-audit              # scan the current directory
npx vibe-audit ./my-app     # scan a specific path
npx vibe-audit --json       # machine-readable output
```

Exits with code `1` if any HIGH-severity findings are present, otherwise `0`. Useful as a pre-commit hook or in CI.

## What it checks

| ID | Severity | Name | What it looks for |
|----|----------|------|-------------------|
| 01 | HIGH | hardcoded-secrets | API keys pasted directly into source (`sk-…`, `AKIA…`, `ghp_…`, `OPENAI_API_KEY=…`, Stripe live keys, Supabase service role, etc.) |
| 02 | HIGH | exposed-env | `.env` / `.env.local` / `.env.production` files that aren't covered by `.gitignore`, or nested env files in subdirectories |
| 03 | MEDIUM | console-log-in-prod | `console.log/debug/info` calls inside `dist/`, `build/`, `.next/`, or `prod/` directories |
| 04 | HIGH | wildcard-cors | `Access-Control-Allow-Origin: *`, `cors({ origin: '*' })`, or `cors({ origin: true })` |
| 05 | MEDIUM | missing-input-validation | Express/Fastify `POST`/`PUT`/`PATCH`/`DELETE` handlers that use `req.body` with no `zod`/`joi`/`yup`/`ajv` import in the file |
| 06 | HIGH | plaintext-password | Variables named `password` / `userPassword` / `passwd` assigned a literal string with no `bcrypt`/`argon`/`scrypt`/`pbkdf2`/`hash` nearby |
| 07 | HIGH | public-s3 | `"Principal": "*"` or `"Principal": { "AWS": "*" }` in JSON/Terraform/JS — usually a wide-open S3 bucket policy |
| 08 | MEDIUM | debug-routes-no-auth | Routes mounted at `/debug`, `/_internal`, `/admin/debug`, `/dev`, `/test-endpoint` in a file with no visible auth middleware |
| 09 | HIGH | sql-injection | Template-literal SQL queries (``` `SELECT ... ${var}` ```) — classic injection vector |
| 10 | MEDIUM | missing-rate-limit | Express `POST`/`PUT`/`PATCH`/`DELETE` handlers with no `rateLimit`/`slowDown`/`express-rate-limit` import in the file |

The checks are intentionally simple, file-local regex passes. They are designed to catch *obvious* mistakes — not replace a real SAST tool like Semgrep or Snyk. False positives happen. Read each finding before fixing.

## Skipped directories

By default: `node_modules`, `.git`, `dist`, `build`, `.next`, `coverage`, `.nuxt`, `.turbo`, `.cache`, `out`, `__pycache__`, `.venv`, `venv`. The walker also respects `.gitignore` at the project root for common patterns.

## Output

Default (terminal):

```
vibe-audit findings:

test-fixtures/api/server.js
  [HIGH]   6:24 Hardcoded secret: OpenAI-style API key (sk-…)  (01)
  [HIGH]  10:1  Wildcard CORS: cors({ origin: '*' })  (04)
  [MEDIUM] 14:1 app.post(…) handler uses req.body without a schema validator.  (05)
  ...

7 issues found across 4 files (4 high, 3 medium, 0 low).
```

`--json` returns the same data as a structured object for piping into other tools.

## Testing the tool against intentional violations

The fixture files that exercise each check live in `test-fixtures/`. They are NOT committed to git — they contain strings shaped like real API keys (deliberately fake but matching the patterns the tool catches), and GitHub's secret scanner refuses pushes that contain those shapes regardless of how clearly fake they are.

To create the fixtures locally:

```bash
npm run setup-fixtures
```

That writes 6 fixture files under `test-fixtures/` with intentional violations of every check. Then:

```bash
npm test
```

runs the audit against them. You should see 20+ findings across the 10 categories.

## Contributing

PRs welcome — especially new checks. Each check lives in `lib/checks/NN-name.js` and exports:

```js
module.exports = {
  id: 'NN',
  name: 'short-kebab-name',
  severity: 'HIGH' | 'MEDIUM' | 'LOW',
  run(filepath, contents) {
    return [{ file, line, col, message }];
  },
  // OR, for checks that need the whole file list:
  runOnFileList(files, root) { return [...]; },
};
```

Then add it to the `checks` array in `bin/cli.js`. Add a fixture under `test-fixtures/` that triggers it.

## License

MIT — see [LICENSE](./LICENSE).

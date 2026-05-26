# Release v1.1.0 - Security & Dependency Refresh

## Headline

Cleared **46 npm advisories down to 0** in production (4 remain in build-only tooling).
Major dep refresh across the stack, base Docker image moved to current Node LTS,
and ESLint migrated to flat config.

## Security

Production audit before this release: **1 critical, 28 high, 16 moderate, 1 low**.
After: **0** in the production dependency tree.

The 4 remaining advisories are all in the `jison` parser-generator chain
(`jison` → `jison-lex` → `nomnom` → `underscore`). `jison` is now in
`devDependencies`: it is only invoked by `scripts/compile-grammars.js` at build
time, and the generated parsers in `src/generated/jison/` are self-contained at
runtime. Production installs (`npm install --omit=dev`) ship none of it.

Notable direct deps with security-relevant fixes:

| Package | Old | New | Fix |
|---|---|---|---|
| `@modelcontextprotocol/sdk` | ^1.18.0 | ^1.29.0 | ReDoS, cross-client data leak, DNS rebinding default |
| `axios` | ^1.12.2 | ^1.16.1 | SSRF via NO_PROXY bypass (CVE-2025-62718 follow-up) |
| `express` | ^4.18.2 | ^5.2.1 | path-to-regexp ReDoS, body-parser DoS |
| `multer` | ^2.0.2 | ^2.1.1 | DoS via incomplete cleanup, resource exhaustion, uncontrolled recursion |
| `helmet` | ^7.1.0 | ^8.2.0 | dep chain refresh |
| `joi` / `zod` / `uuid` | 17 / 3 / 9 | 18 / 4 / 14 | underlying lodash, validator, regex fixes |

## Breaking changes

- **Node engine: `>=18` → `>=20`.** Required by ESLint 9, uuid 14 (ESM), and
  several dev tools.
- **Express 4 → 5.** Wildcard route `app.use('*', ...)` is no longer valid
  (path-to-regexp 6 syntax change). The 404 handler now uses path-less
  middleware (`app.use((req, res) => ...)`), which is equivalent.
- **uuid 14 is ESM-only** for new code paths. Existing `require('uuid')` keeps
  working through interop.
- **ESLint 8 → 9 with flat config.** `.eslintrc.js` removed; replaced by
  `eslint.config.js`. `eslint-config-airbnb-base` removed (was unused and
  blocks the upgrade).
- **Jest 29 → 30.** Renamed CLI flag `--testPathPattern` → `--testPathPatterns`
  (npm scripts updated).

## Docker

Base image moved from `node:20-alpine` / `node:18-alpine` to `node:22-alpine`
(current Node LTS, supported through April 2027). Multi-arch (amd64/arm64)
publication target remains `gregoriomomm/fast-mermaid-validator-mcp:1.1.0`.

## Verified

- Integration tests: **31/32 pass** (the 1 failure — "Example Diagram" — is
  pre-existing; its `exampleDiagram.jison` grammar isn't checked in).
- Live server boots; all routes resolve; 404 handler works; validation API
  accepts/rejects correctly.
- `npm audit --omit=dev`: 0 vulnerabilities.

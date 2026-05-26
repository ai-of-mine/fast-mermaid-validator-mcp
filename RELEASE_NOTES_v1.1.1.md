# Release v1.1.1 - Security & Dependency Refresh

> **v1.1.0 was published and immediately superseded by v1.1.1:** v1.1.0 moved
> `jison` to `devDependencies`, but `src/services/grammarCompiler.js`
> top-level-requires it, so the production Docker image failed to start with
> `Cannot find module 'jison'`. v1.1.1 restores `jison` to runtime deps.

## Headline

Cleared **42 of 46 npm advisories** in production. The remaining 4 are all in
the `jison` parser-generator transitive chain (`jison → jison-lex → nomnom →
underscore`), which we can't drop without a parser rewrite. Major dep refresh
across the stack, base Docker image moved to current Node LTS, ESLint migrated
to flat config.

## Security

Production audit before this release: **1 critical, 28 high, 16 moderate, 1 low** (46 total).
After: **4 high** (all in the `jison` runtime parser chain).

The 4 remaining advisories — `jison`, `jison-lex`, `nomnom`, `underscore` —
sit in the parser-generator runtime path: `customMermaidValidator` calls
`grammarCompiler.compileAllGrammars()` at startup, which calls `new
jison.Parser(grammarContent)`. We accept this risk for v1.1.x; the
attack surface is parsing of user-supplied diagram source, and the specific
advisories are prototype-pollution / unbounded-recursion in `underscore` and
CLI arg parsing in `nomnom` — neither obviously triggerable through the
validator's surface, but worth a follow-up to lazy-load or migrate to
`@gerhobbelt/jison`.

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
(current Node LTS, supported through April 2027).

Three image variants published, all multi-arch (amd64/arm64):

| Tag | Base | Size | Use case |
|---|---|---|---|
| `gregoriomomm/fast-mermaid-validator-mcp:1.1.1` | `node:22-alpine` | ~270 MB | Default; smallest popular base |
| `gregoriomomm/fast-mermaid-validator-mcp:1.1.1-distroless` | `gcr.io/distroless/nodejs22-debian12` | ~200 MB | Security-max: no shell, no pkg mgr |
| `gregoriomomm/fast-mermaid-validator-mcp:1.1.1-ubi` | `ubi9/nodejs-22-minimal` | ~300 MB | IBM / RHEL / OpenShift / FIPS deployments |

The `:latest` tag points at the alpine variant.

## Verified

- Integration tests: **31/32 pass** (the 1 failure — "Example Diagram" — is
  pre-existing; its `exampleDiagram.jison` grammar isn't checked in).
- Live server boots; all routes resolve; 404 handler works; validation API
  accepts/rejects correctly.
- All three Docker variants build successfully and run the server.

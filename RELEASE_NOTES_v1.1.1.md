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
jison.Parser(grammarContent)`.

### Exploitability analysis (why we accept these for v1.1.x)

| Advisory | Vulnerable code path | Reachable through this validator? |
|---|---|---|
| `underscore` prototype pollution | `_.template()` with attacker-controlled input | **No.** `jison-lex` uses `_.each`, `_.map`, `_.contains` at parser-build time. `_.template` is not on the validator's request path. |
| `underscore` unbounded recursion in `_.flatten`/`_.isEqual` | recursive calls on attacker-controlled deeply-nested data | **No.** Validator input is text (Mermaid source), not deeply-nested JSON; parser internals build flat token streams. |
| `nomnom` DoS / unbounded memory | jison's CLI mode (`jison foo.jison`) | **No.** We call `new jison.Parser(content)` directly; `nomnom` is never instantiated. |
| `jison` / `jison-lex` parents | inherit from `underscore` / `nomnom` | Same as above. |

The audit numbers are real, but the practical exploitability through the
validator's HTTP/MCP API surface is negligible — none of the vulnerable code
paths are reachable from user-supplied diagram input.

### Why we didn't switch upstream

- **`jison-gho`** (Gerhobbelt's fork): introduces *more* advisories (8: 5 mod, 3 high) via its own `yargs-parser` / `core-js` chain, AND its lexer rejects our existing `.jison` grammar files. Net regression.
- **Refactor to use pre-generated parsers only**: viable but ~2-3 hours of work — `scripts/compile-grammars.js` currently emits malformed CJS modules (literal `module.exports = var parser = ...`) so the generation pipeline needs fixing first. Tracked as a follow-up for v1.2.0.

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

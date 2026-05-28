# Changelog

All notable changes to `@ai-of-mine/fast-mermaid-validator-mcp` are documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions follow [SemVer](https://semver.org/spec/v2.0.0.html).

## [1.4.2] — 2026-05-28

### Added

- `test/regression/full-coverage.test.js` — comprehensive 150-assertion suite (every endpoint, every diagram type with and without comments, OpenAPI spec shape, tri-state semantics, error responses). Wired into `npm run test:full`.

### Fixed

- **`%%{init:...}%%` directives on every diagram type.** v1.4.1 added grammar-level rules for both `%%` comments and `%%{...}%%` directives, but the non-greedy directive rule worked only in some grammars (worked in `flow.jison`, failed in `erDiagram.jison` — likely due to its `%options case-insensitive` interaction with the `*?` quantifier). Hybrid fix: `%%` comments stay grammar-level (works uniformly via simple rule), `%%{...}%%` directives revert to a one-line JS strip in `customMermaidValidator.validateDiagram` (handles all grammars uniformly; directives are renderer metadata so stripping is semantically correct).

### Known limitations

- **`sankey-beta` does not tolerate `%%` comment lines interleaved with CSV data rows.** Its lexer's CSV state consumes lines greedily; the skip-comment rule does not fire there. Marked as expected-fail in `full-coverage.test.js`. Tracked for v1.5.0 grammar refresh.
- **`classDiagram` inline `%%` (e.g., `class Animal %% inline`)** is not accepted in some lexer states. Full-line `%%` works. Tracked for v1.5.0.

## [1.4.1] — 2026-05-28

### Fixed

- **`%%` line-comments now handled at the grammar level** in `flow.jison` and `erDiagram.jison`. The v1.4.0 fix used a JS regex pre-strip that silently rewrote user content (so line numbers in parse errors shifted) and did not catch inline `text %% comment`. v1.4.1 adds `\%\%(?!\{)[^\n]*` and `\%\%\{[\s\S]*?\}\%\%[^\n]*` lexer rules to those two grammars; the JS pre-strip was removed.
- Inline `text %% comment` (mid-line) is now accepted by every grammar, not just full-line `%%`.
- Parse-error line numbers are accurate again — no JS rewrite means the line referenced in the error is the line in the user's input.

### Changed

- `customMermaidValidator.validateDiagram` no longer mutates `diagram.content` before parsing.
- OpenAPI description's "Notes" section says comments and directives are "recognized by the grammars and ignored" (not "stripped before parsing"), reflecting the new mechanism.

### Internal

- `src/services/grammars/flowchart/flow.jison`: 2 new lexer rules.
- `src/services/grammars/er/erDiagram.jison`: 2 new lexer rules.
- Regenerated `src/generated/jison/flow.js` and `src/generated/jison/erDiagram.js`.
- Full regression suite (41 assertions) still passes against the new grammars.

## [1.4.0] — 2026-05-28

This is a substantive release covering OpenAPI documentation, a new tri-state response model, two false-positive bug fixes, and infrastructure cleanups.

### Added

- **OpenAPI / Swagger UI at `/docs`** with a populated spec — previously the page rendered but showed "No operations defined". All 10 (now 11) endpoints documented with request/response schemas, examples, and error responses. Description includes a tri-state semantics table, endpoint-stability tier, and vendored-snapshot caveats.
- **`GET /api/v1/capabilities`** — returns three sets so callers can branch on what the validator can actually do:
  - `validatedTypes`: types with a working parser (currently ~32 incl. aliases)
  - `declaredTypes`: keywords the type-detector recognizes
  - `unvalidatedTypes`: declared keywords with no parser (silent-pass hazards like `zenuml`, `exampleDiagram`)
- **Tri-state validation result.** Every per-diagram result now has:
  - `valid: true`, `status: "validated"` — parsed cleanly
  - `valid: false`, `status: "invalid"` — parsed with syntax errors
  - `valid: null`, `status: "unsupported"` — no parser available; we could not check
  - `diagramType` — the detected type (or `null` when undetectable)
  - Callers gating on `valid !== true` still get conservative "don't ship" behavior for both `false` and `null`.
- **`unsupportedDiagrams` summary field** on `/validate`, `/upload/file`, `/markdown/validate` so totals are honest (`validDiagrams` + `invalidDiagrams` + `unsupportedDiagrams` = `totalDiagrams`). Previously unsupported diagrams were silently counted as invalid.
- **`/upload/fix`** endpoint — multipart-upload variant of `/markdown/fix`, accepts `.md`/`.mmd`/`.txt` files. Marked **BETA** in OpenAPI.
- **`scripts/generate-openapi.js`** + `docs/openapi.json` — pre-generated spec checked into the repo. Run `node scripts/generate-openapi.js` to refresh.
- **`test/regression/v1.4.0-bugfixes.test.js`** — 41 assertions covering every bug fixed in this release. Wired into `npm run test:regression`.
- **`@swagger` JSDoc annotations on every REST route** (`health.js` × 4, `validation.js` × 4, `markdown.js` × 2).
- **`syntaxRuleLoader.js` + `validationInstructions.js`** plus `src/config/syntax-rules/` (20 rule files) — invalid-diagram responses now include `applicableSyntax`, LLM-friendly fix guidance.

### Fixed

- **`%%` line-comments crashed flowchart and erDiagram parsers.** Reported by a user trying to validate a flowchart with `<spaces>%%`. Root cause: those two grammars lacked the upstream skip-comment lexer rule. Fixed in v1.4.0 with a JS pre-strip; v1.4.1 moved the fix to the grammar level (see above).
- **`mindmap`, `c4Context`, `quadrantChart`, and most other types were silently routed to the flowchart parser** by `markdownMermaidFixer.detectDiagramType`, which only knew 10 of 36 diagram keywords and defaulted everything else to `"flowchart"`. Fixed by delegating to `customMermaidValidator.detectDiagramType` (single source of truth covering all keywords).
- **Unknown gibberish types** (e.g., `foobar`) used to return a misleading flowchart parse error (`Expecting 'GRAPH'`). They now return `valid: null, status: "unsupported"`.
- **`zenuml` returned `valid: true` silently** despite having no working parser. Now correctly returns `valid: null, status: "unsupported"` so callers know nothing was actually checked.
- **`%%{init:...}%%` theme directives** on the first line confused diagram-type detection. `detectDiagramType` now skips blank lines and `%%`-prefixed lines when looking for the diagram-type keyword.
- **Malformed JSON requests** returned an opaque 500. The error handler now returns 400 with a useful hint: "Check for unescaped newlines or backticks in shell quoting. Build the payload with `jq -Rs '{content:.}' file.md` to avoid escape issues."
- **`/docs` page was empty in the production container.** `swagger-jsdoc` + `swagger-ui-express` were in `devDependencies`; `NODE_ENV=production` skipped them. Moved to `dependencies`. Also removed the `if (config.server.env === 'development')` gate around `setupSwaggerDocs()` — there is no secret in the OpenAPI spec, downstream consumers need the contract.

### Changed

- **Default 500 response now includes `name` and `message`** instead of an opaque "Something went wrong". Full `stack` remains development-only.
- **OpenAPI version, description, contact, license** now read dynamically from `package.json` instead of being hardcoded to `1.0.0` / "High-performance API..." / `support@example.com`.
- **`MarkdownMermaidFixer` is now a process-wide singleton** (`services/fixerInstance.js`). Previously each request constructed a new fixer, which compiled ~25 jison grammars (~4–5s) every time. First request after process start is now ~40 ms instead of ~820 ms.
- **Reusable OpenAPI schemas** (`Error`, `DiagramInput`, `ValidationError`, `DiagramResult`, `MarkdownValidateResponse`) defined centrally, referenced via `$ref` in route annotations.
- **Auto-fix endpoints (`/markdown/fix`, `/upload/fix`) flagged `[BETA]`** in their OpenAPI summary, description, and the top-level endpoint-stability section. Heuristic pattern-based rewriter; review the diff before accepting.

### Removed

- 5 stale `src/services/grammars/backup_*.jison` files (~46 KB of cruft).
- 1158 lines of dead duplicate code in `services/grammarCompiler.js` (inline DB functions that had been refactored into `mermaidDbContexts.js` but never deleted).
- `exampleDiagram` grammar-path mapping that produced a "Grammar file does not exist" warning on every boot.

### Internal

- Reused upstream OSS `services/fileProcessor.js` improvements; ported IBM's `validateSafePath` (CWE-22) and `normalizeEscapedContent` to the OSS branch.
- Docker images for `1.4.0` and `1.4.1` published to Docker Hub as **multi-arch** (`linux/amd64` + `linux/arm64`) under tags `1.4.x`, `1.4.x-ubi`, and `latest`.

## [1.3.6] — 2026-05-28

(Previous release; predates this changelog. See git history for details.)

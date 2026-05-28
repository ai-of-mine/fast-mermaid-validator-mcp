# Node.js examples

Two scripts exercising the REST API end-to-end. **No npm dependencies** —
uses the Node 18+ built-in `fetch`, `FormData`, and `Blob` globals, so
`node examples/nodejs/validate.js` works on a fresh checkout.

## Running

```bash
# 1. Start the server (any of these)
npx @ai-of-mine/fast-mermaid-validator-mcp@latest                         # REST only on :8000
podman run --rm -p 8000:8000 -p 8080:8080 \
  docker.io/gregoriomomm/fast-mermaid-validator-mcp:latest-ubi            # REST + MCP

# 2. Run an example (defaults to http://localhost:8000)
node examples/nodejs/validate.js
node examples/nodejs/fix.js

# Override the API URL if you're running on a non-default host/port
API_URL=http://localhost:8000 node examples/nodejs/validate.js
```

## What each script demonstrates

| Script | Endpoints exercised | What it shows |
|---|---|---|
| `validate.js` | `POST /api/v1/validate` (JSON), `POST /api/v1/upload/file` (multipart) | Valid vs invalid flowchart in both transports. Prints `validDiagrams`/`invalidDiagrams` and the first syntax error. |
| `fix.js` | `POST /api/v1/markdown/fix` (JSON), `POST /api/v1/upload/fix` (multipart) | Two-diagram markdown fix, unfixable diagram (sanity), markdown vs raw `.mmd` upload (with auto-wrap/unwrap). |

Both scripts use the same patterns you'd embed in a real app — adapt the
helper functions (`validateContent`, `validateFile`, `fixContent`, `fixFile`)
into your own modules.

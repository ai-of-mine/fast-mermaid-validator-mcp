# Python examples

Two scripts exercising the REST API end-to-end. **No pip install required** —
uses `urllib` from the standard library, so `python3 examples/python/validate.py`
works on any Python 3.8+ with no external dependencies.

For real production apps, prefer
[`requests`](https://requests.readthedocs.io/) or
[`httpx`](https://www.python-httpx.org/) — the urllib code here is a
demonstration, not a recommendation.

## Running

```bash
# 1. Start the server (any of these)
npx @ai-of-mine/fast-mermaid-validator-mcp@latest                         # REST only on :8000
podman run --rm -p 8000:8000 -p 8080:8080 \
  docker.io/gregoriomomm/fast-mermaid-validator-mcp:latest-ubi            # REST + MCP

# 2. Run an example (defaults to http://localhost:8000)
python3 examples/python/validate.py
python3 examples/python/fix.py

# Override the API URL if you're running on a non-default host/port
API_URL=http://localhost:8000 python3 examples/python/validate.py
```

## What each script demonstrates

| Script | Endpoints exercised | What it shows |
|---|---|---|
| `validate.py` | `POST /api/v1/validate` (JSON), `POST /api/v1/upload/file` (multipart) | Valid vs invalid flowchart in both transports. Prints `validDiagrams`/`invalidDiagrams` and the first syntax error. |
| `fix.py` | `POST /api/v1/markdown/fix` (JSON), `POST /api/v1/upload/fix` (multipart) | Two-diagram markdown fix, unfixable diagram (sanity), markdown vs raw `.mmd` upload (with auto-wrap/unwrap). |

Both scripts use the same patterns you'd embed in a real app — adapt the
helper functions (`validate_content`, `validate_file`, `fix_content`,
`fix_file`) into your own modules.

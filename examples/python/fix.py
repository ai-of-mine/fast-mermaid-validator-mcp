#!/usr/bin/env python3
"""
Auto-fix Mermaid diagrams via the REST API.

Demonstrates two patterns against a running fast-mermaid-validator-mcp:
  A. Send markdown content as JSON      -> POST /api/v1/markdown/fix
  B. Send a file via multipart upload   -> POST /api/v1/upload/fix

Run a server first:
  npx @ai-of-mine/fast-mermaid-validator-mcp@latest
  podman run --rm -p 8000:8000 -p 8080:8080 docker.io/gregoriomomm/fast-mermaid-validator-mcp:latest-ubi

Then:
  python3 examples/python/fix.py
  API_URL=http://localhost:8000 python3 examples/python/fix.py

Both endpoints run validate -> fix -> re-validate in ONE call (up to
`maxIterations`, default 5). Use the response's `fixedContent` field as
the rewritten file body.

Uses urllib only (stdlib) -- no `requests` install needed.
"""

import json
import mimetypes
import os
import sys
import tempfile
import uuid
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API = os.environ.get("API_URL", "http://localhost:8000")

BROKEN_MARKDOWN = (
    "# Architecture\n\n"
    "```mermaid\n"
    "flowchart TD\n"
    "  A-->B\n"
    "  B-->C[Label with (parens)]\n"
    "```\n\n"
    "```mermaid\n"
    "flowchart TD\n"
    "  A-->\n"
    "  -->B\n"
    "```\n"
)

UNFIXABLE_MARKDOWN = (
    "```mermaid\n"
    "flowchart TD\n"
    "  @@@ NOT MERMAID @@@\n"
    "```\n"
)


def _post_json(url: str, payload: dict) -> dict:
    req = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(req) as r:
            return json.loads(r.read().decode("utf-8"))
    except HTTPError as e:
        return json.loads(e.read().decode("utf-8"))


def _post_multipart(url: str, file_path: str, field_name: str = "file") -> dict:
    boundary = "----mermaid-validator-" + uuid.uuid4().hex
    with open(file_path, "rb") as fh:
        body_bytes = fh.read()
    mime = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
    file_name = os.path.basename(file_path)

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="{field_name}"; filename="{file_name}"\r\n'
        f"Content-Type: {mime}\r\n\r\n"
    ).encode("utf-8") + body_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = Request(
        url,
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        with urlopen(req) as r:
            return json.loads(r.read().decode("utf-8"))
    except HTTPError as e:
        return json.loads(e.read().decode("utf-8"))


# ---------------------------------------------------------------------------
# A. JSON body  ->  POST /api/v1/markdown/fix
# ---------------------------------------------------------------------------
def fix_content(markdown: str, options: dict | None = None) -> dict:
    return _post_json(
        f"{API}/api/v1/markdown/fix",
        {"content": markdown, "options": options or {}},
    )


# ---------------------------------------------------------------------------
# B. multipart upload  ->  POST /api/v1/upload/fix
# ---------------------------------------------------------------------------
def fix_file(file_path: str) -> dict:
    return _post_multipart(f"{API}/api/v1/upload/fix", file_path)


def main() -> int:
    print(f">>> fixing against {API}\n")

    print("A. JSON content — TWO broken diagrams (fixable)")
    a1 = fix_content(BROKEN_MARKDOWN)
    s = a1["statistics"]
    print(f"   success={a1['success']}  fixedDiagrams={s['fixedDiagrams']}  failedDiagrams={s['failedDiagrams']}")
    print("   --- fixedContent ---")
    for line in a1["fixedContent"].splitlines():
        print("   " + line)

    print("\nA. JSON content — UNFIXABLE garbage")
    a2 = fix_content(UNFIXABLE_MARKDOWN)
    s = a2["statistics"]
    print(f"   success={a2['success']}  fixedDiagrams={s['fixedDiagrams']}  failedDiagrams={s['failedDiagrams']}\n")

    # multipart upload — supports raw .mmd too (auto-wrapped)
    with tempfile.TemporaryDirectory() as tmp:
        md = os.path.join(tmp, "mermaid-broken.md")
        mmd = os.path.join(tmp, "mermaid-broken.mmd")
        with open(md, "w") as f: f.write(BROKEN_MARKDOWN)
        with open(mmd, "w") as f: f.write("flowchart TD\n  A-->B\n  B-->C[Label with (parens)]\n")

        print("B. multipart upload — markdown file")
        b1 = fix_file(md)
        s = b1["statistics"]
        print(f"   success={b1['success']}  fileName={b1['fileName']}  wasMarkdown={b1['wasMarkdown']}  fixedDiagrams={s['fixedDiagrams']}")

        print("\nB. multipart upload — raw .mmd file (auto-wrapped, unwrapped in response)")
        b2 = fix_file(mmd)
        print(f"   success={b2['success']}  fileName={b2['fileName']}  wasMarkdown={b2['wasMarkdown']}")
        print("   --- fixedContent ---")
        for line in b2["fixedContent"].splitlines():
            print("   " + line)

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except URLError as e:
        print(f"network error talking to {API}: {e}", file=sys.stderr)
        sys.exit(2)

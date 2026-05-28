#!/usr/bin/env python3
"""
Validate Mermaid diagrams via the REST API.

Demonstrates two patterns against a running fast-mermaid-validator-mcp:
  A. Send raw content as JSON           -> POST /api/v1/validate
  B. Send a file via multipart upload   -> POST /api/v1/upload/file

Run a server first (any of these works):
  npx @ai-of-mine/fast-mermaid-validator-mcp@latest
  podman run --rm -p 8000:8000 -p 8080:8080 docker.io/gregoriomomm/fast-mermaid-validator-mcp:latest-ubi

Then:
  python3 examples/python/validate.py
  API_URL=http://localhost:8000 python3 examples/python/validate.py

Uses urllib only (stdlib) -- no `requests` install needed. For real apps
prefer `requests` or `httpx`.
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

VALID_FLOWCHART = (
    "flowchart TD\n"
    "  Start --> Decision\n"
    "  Decision -->|yes| Done\n"
    "  Decision -->|no| Retry\n"
    "  Retry --> Decision"
)

INVALID_FLOWCHART = "flowchart TD\n  A-->\n  -->B"


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
        # 4xx still returns JSON -- surface it
        return json.loads(e.read().decode("utf-8"))


def _post_multipart(url: str, file_path: str, field_name: str = "file") -> dict:
    """Hand-rolled multipart/form-data so we stay in stdlib."""
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
# A. JSON body  ->  POST /api/v1/validate
# ---------------------------------------------------------------------------
def validate_content(content: str, diagram_type: str = "flowchart") -> dict:
    return _post_json(
        f"{API}/api/v1/validate",
        {"diagrams": [{"content": content, "type": diagram_type}]},
    )


# ---------------------------------------------------------------------------
# B. multipart upload  ->  POST /api/v1/upload/file
# ---------------------------------------------------------------------------
def validate_file(file_path: str) -> dict:
    return _post_multipart(f"{API}/api/v1/upload/file", file_path)


def main() -> int:
    print(f">>> validating against {API}\n")

    print("A. JSON content — VALID flowchart")
    a1 = validate_content(VALID_FLOWCHART)
    print(f"   validDiagrams={a1['validDiagrams']}  invalidDiagrams={a1['invalidDiagrams']}\n")

    print("A. JSON content — INVALID flowchart (dangling arrow)")
    a2 = validate_content(INVALID_FLOWCHART)
    print(f"   validDiagrams={a2['validDiagrams']}  invalidDiagrams={a2['invalidDiagrams']}")
    err0 = a2["results"][0]["errors"][0]
    print(f"   first error: {err0['type']}: {err0['message'].splitlines()[0]}\n")

    # multipart upload — two temp files
    with tempfile.TemporaryDirectory() as tmp:
        good = os.path.join(tmp, "mermaid-good.md")
        bad = os.path.join(tmp, "mermaid-bad.md")
        with open(good, "w") as f: f.write("# Good\n```mermaid\n" + VALID_FLOWCHART + "\n```\n")
        with open(bad, "w") as f: f.write("# Bad\n```mermaid\n" + INVALID_FLOWCHART + "\n```\n")

        print("B. multipart upload — VALID file")
        b1 = validate_file(good)
        print(f"   validDiagrams={b1['validDiagrams']}  invalidDiagrams={b1['invalidDiagrams']}\n")

        print("B. multipart upload — INVALID file")
        b2 = validate_file(bad)
        print(f"   validDiagrams={b2['validDiagrams']}  invalidDiagrams={b2['invalidDiagrams']}\n")

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except URLError as e:
        print(f"network error talking to {API}: {e}", file=sys.stderr)
        sys.exit(2)

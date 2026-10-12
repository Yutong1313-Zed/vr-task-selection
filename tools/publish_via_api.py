"""Publish a commit through the GitHub REST API instead of the git transport.

The git smart-HTTP endpoint (github.com/.../info/refs) is blocked or throttled on
some networks while api.github.com keeps working, so a normal `git push` can
fail with "Could not connect to server". This script performs the equivalent of
a fast-forward commit using the Git Data API:

    blobs -> tree -> commit -> update ref

Only the files in FILES are uploaded; everything else keeps the blob already in
the parent tree, so the commit is a delta rather than a full re-upload.

Usage:
    python tools/publish_via_api.py --repo USER/REPO --message "..." --token ghp_xxx
    python tools/publish_via_api.py ... --dry-run
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.github.com"

# Files to (re)upload, relative to the repository root.
FILES = [".gitignore", "README.md", "push-to-github.ps1"]


class GitHub:
    def __init__(self, token: str) -> None:
        self.token = token

    def request(self, method: str, path: str, payload: dict | None = None) -> dict:
        url = path if path.startswith("http") else API + path
        data = json.dumps(payload).encode() if payload is not None else None
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("Authorization", f"Bearer {self.token}")
        req.add_header("Accept", "application/vnd.github+json")
        req.add_header("User-Agent", "vr-task-selection-publish")
        if data:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=45) as resp:
                body = resp.read().decode()
                return json.loads(body) if body else {}
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode(errors="replace")
            raise SystemExit(f"HTTP {exc.code} on {method} {url}\n{detail}") from None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", required=True, help="owner/name")
    ap.add_argument("--message", required=True)
    ap.add_argument("--token", default=os.environ.get("GITHUB_TOKEN"))
    ap.add_argument("--branch", default="main")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not args.token:
        return print("error: no token (pass --token or set GITHUB_TOKEN)") or 2

    gh = GitHub(args.token)
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    ref = gh.request("GET", f"/repos/{args.repo}/git/ref/heads/{args.branch}")
    head_sha = ref["object"]["sha"]
    head = gh.request("GET", f"/repos/{args.repo}/git/commits/{head_sha}")
    base_tree = head["tree"]["sha"]
    print(f"parent commit : {head_sha[:8]}")
    print(f"parent tree   : {base_tree[:8]}")

    changes = []
    for rel in FILES:
        path = os.path.join(root, rel.replace("/", os.sep))
        if not os.path.isfile(path):
            print(f"  skip (missing) {rel}")
            continue
        with open(path, "rb") as fh:
            raw = fh.read()
        blob = gh.request(
            "POST",
            f"/repos/{args.repo}/git/blobs",
            {"content": base64.b64encode(raw).decode(), "encoding": "base64"},
        )
        changes.append({"path": rel, "mode": "100644", "type": "blob", "sha": blob["sha"]})
        print(f"  blob {blob['sha'][:8]}  {rel}  ({len(raw)} bytes)")

    if not changes:
        return print("nothing to publish") or 0

    if args.dry_run:
        print("\n--dry-run: stopping before tree/commit/ref update")
        return 0

    tree = gh.request(
        "POST",
        f"/repos/{args.repo}/git/trees",
        {"base_tree": base_tree, "tree": changes},
    )
    commit = gh.request(
        "POST",
        f"/repos/{args.repo}/git/commits",
        {"message": args.message, "tree": tree["sha"], "parents": [head_sha]},
    )
    gh.request(
        "PATCH",
        f"/repos/{args.repo}/git/refs/heads/{args.branch}",
        {"sha": commit["sha"], "force": False},
    )
    print(f"\nnew commit    : {commit['sha'][:8]}")
    print(f"branch        : {args.branch} updated")
    print(f"verify        : https://github.com/{args.repo}/commit/{commit['sha']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

#!/usr/bin/env python3
"""Lint a project wiki kept in Karpathy's LLM Wiki pattern (see references/wiki.md).

Usage: python wiki_lint.py [WIKI_DIR] [--repo REPO_ROOT]
WIKI_DIR defaults to docs/wiki; REPO_ROOT defaults to the nearest parent with .git.
Exit codes: 0 clean (warnings allowed), 1 errors found, 2 usage error.
"""
import argparse
import re
import sys
from pathlib import Path

TYPES = {"overview", "module", "feature", "decision", "gotcha"}
REQUIRED = ("title", "type", "updated")
SPECIAL = {"index", "log"}  # navigation files: no frontmatter, never orphans
LINK = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")


def parse_frontmatter(text):
    """Return a dict for a leading --- block, or None. Handles scalars and simple lists."""
    if not text.startswith("---"):
        return None
    end = text.find("\n---", 3)
    if end == -1:
        return None
    fields, key = {}, None
    for line in text[3:end].splitlines():
        if not line.strip():
            continue
        item = re.match(r"\s+-\s+(.*)", line) or re.match(r"-\s+(.*)", line)
        if item and key and isinstance(fields.get(key), list):
            fields[key].append(item.group(1).strip().strip("'\""))
            continue
        match = re.match(r"([A-Za-z_][\w-]*):\s*(.*)", line)
        if not match:
            continue
        key, value = match.group(1), match.group(2).split(" #")[0].strip()
        if value.startswith("[") and value.endswith("]"):
            fields[key] = [v.strip().strip("'\"") for v in value[1:-1].split(",") if v.strip()]
        else:
            fields[key] = value.strip("'\"") if value else []
    return fields


def find_repo(start):
    for path in (start, *start.parents):
        if (path / ".git").exists():
            return path
    return None


def link_target(raw):
    name = raw.strip().replace("\\", "/").split("/")[-1].lower()
    return name[:-3] if name.endswith(".md") else name


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("wiki", nargs="?", default="docs/wiki")
    parser.add_argument("--repo", help="repo root that `sources` paths are relative to")
    args = parser.parse_args()

    wiki = Path(args.wiki).resolve()
    if not (wiki / "index.md").is_file():
        print(f"error: {wiki} has no index.md", file=sys.stderr)
        return 2
    repo = Path(args.repo).resolve() if args.repo else find_repo(wiki)

    errors, warnings = [], []
    pages = {}
    for path in sorted(wiki.rglob("*.md")):
        if ".obsidian" in path.parts:
            continue
        stem = path.stem.lower()  # Obsidian matches link names case-insensitively
        if stem in pages:
            errors.append(f"duplicate name: {rel(pages[stem], wiki)} and {rel(path, wiki)}")
        pages[stem] = path

    inbound = {stem: set() for stem in pages}
    for stem, path in pages.items():
        text = path.read_text(encoding="utf-8")
        for raw in LINK.findall(text):
            target = link_target(raw)
            if target not in pages:
                errors.append(f"broken link: {rel(path, wiki)} -> [[{raw.strip()}]]")
            elif target != stem:
                inbound[target].add(stem)

        if stem in SPECIAL:
            continue
        fields = parse_frontmatter(text)
        if fields is None:
            errors.append(f"missing frontmatter: {rel(path, wiki)}")
            continue
        missing = [k for k in REQUIRED if not fields.get(k)]
        if missing:
            errors.append(f"missing {', '.join(missing)}: {rel(path, wiki)}")
        page_type = fields.get("type")
        if isinstance(page_type, str) and page_type and page_type not in TYPES:
            errors.append(f"unknown type '{page_type}': {rel(path, wiki)}")
        sources = fields.get("sources") or []
        if isinstance(sources, str):
            sources = [sources]
        if repo:
            for source in sources:
                if source and not (repo / source.rstrip("/")).exists():
                    errors.append(f"missing source {source}: {rel(path, wiki)}")

    for stem, path in pages.items():
        if stem in SPECIAL:
            continue
        if "index" not in inbound[stem]:
            errors.append(f"not in index: {rel(path, wiki)}")
        if not inbound[stem] - SPECIAL:
            warnings.append(f"orphan (linked only from index/log): {rel(path, wiki)}")

    if repo is None:
        warnings.append("no git repo found; `sources` paths not checked (pass --repo)")
    print(f"wiki_lint: {len(pages)} pages, {len(errors)} errors, {len(warnings)} warnings")
    for line in errors:
        print(f"ERROR {line}")
    for line in warnings:
        print(f"WARN  {line}")
    return 1 if errors else 0


def rel(path, root):
    return path.relative_to(root).as_posix()


if __name__ == "__main__":
    sys.exit(main())

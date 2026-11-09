#!/usr/bin/env python3
"""Regenerates the file list and version in sw.js from the files on disk.

Run after editing ANY file of the site:   python3 tools/update-sw.py
(tests/sw-check.js fails if sw.js is out of date.)
"""
import hashlib
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {"tests", "tools", ".git", "node_modules"}
SKIP_FILES = {"sw.js", "README.md", ".DS_Store"}


def shell_files():
    out = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        for name in sorted(filenames):
            if name in SKIP_FILES:
                continue
            out.append(os.path.relpath(os.path.join(dirpath, name), ROOT).replace(os.sep, "/"))
    return sorted(out)


def digest(files):
    h = hashlib.sha256()
    for f in files:
        h.update(f.encode())
        with open(os.path.join(ROOT, f), "rb") as fh:
            h.update(fh.read())
    return h.hexdigest()[:10]


def main():
    files = shell_files()
    version = "dap-" + digest(files)
    entries = ["./"] + files
    block = ",\n".join("  '%s'" % e for e in entries)
    path = os.path.join(ROOT, "sw.js")
    src = open(path, encoding="utf-8").read()
    src = re.sub(r"const VERSION = '[^']*';", "const VERSION = '%s';" % version, src)
    src = re.sub(r"/\* BEGIN SHELL \*/.*?/\* END SHELL \*/", "/* BEGIN SHELL */\n" + block + "\n  /* END SHELL */", src, flags=re.S)
    open(path, "w", encoding="utf-8").write(src)
    print("sw.js updated: %s, %d files" % (version, len(entries)))


if __name__ == "__main__":
    sys.exit(main())

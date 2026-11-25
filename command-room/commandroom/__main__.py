"""Command Room - start the program.

usage:
    python -m commandroom [--settings FILE] [--port N] [--open]

arguments:
    --settings  the local settings file (default: settings.local.json next to the commandroom folder)
    --port      port on 127.0.0.1 (default: the one in the settings, else 8791)
    --open      also open Command Room in its own window (Edge or Chrome in app mode; the normal browser if
                neither is installed)

notes:
    * It listens only on this computer.
    * If Command Room is already running on that port, --open only opens a window on it.
    * The settings file is private and never committed: it holds where the work board, the job files and the
      clusters are. Without it the program starts and says what is missing.
"""
import argparse
import json
import os
import subprocess
import sys
import threading
import urllib.request
import webbrowser

from .server import serve
from .settings import Settings

BROWSERS = (
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "/usr/bin/microsoft-edge", "/usr/bin/google-chrome", "/usr/bin/chromium",
)


def open_window(port, browsers=BROWSERS, popen=subprocess.Popen):
    """Open Command Room as its own window; return what was used ("app" or "browser")."""
    url = f"http://localhost:{port}"
    for exe in browsers:
        if os.path.isfile(exe):
            try:
                popen([exe, f"--app={url}", "--window-size=1500,950"])
                return "app"
            except OSError:
                continue
    webbrowser.open(url)
    return "browser"


def already_running(port):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/state", timeout=1.5) as r:
            return "pipeline" in json.load(r)
    except (OSError, ValueError):
        return False


def main(argv=None):
    ap = argparse.ArgumentParser(prog="python -m commandroom", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--settings")
    ap.add_argument("--port", type=int)
    ap.add_argument("--open", action="store_true")
    args = ap.parse_args(argv)
    port = args.port or Settings(args.settings).data.get("port") or 8791
    if already_running(port):
        print(f"Command Room is already running on http://localhost:{port}", flush=True)
        if args.open:
            open_window(port)
        return 0
    if args.open:
        threading.Timer(1.0, open_window, args=(port,)).start()
    return serve(args.settings, port, announce=lambda text: print(text, flush=True))


if __name__ == "__main__":
    sys.exit(main())

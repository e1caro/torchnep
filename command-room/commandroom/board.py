"""The work board ("Tablero de trabajo").

Command Room reads the board's data file and never writes to it. Every change goes through the board's own
command line, so its checks and its history stay valid.
"""
import subprocess

from .settings import read_json

STATES = {"faltan": "todo", "enviado": "sent", "terminado": "done"}
TO_BOARD = {v: k for k, v in STATES.items()}
STAGES = ("vasp", "training", "shengbte")


class BoardError(Exception):
    pass


def read(path):
    """Return {"items": [...], "history": [...]} or None when the file is missing or unreadable."""
    data = read_json(path) if path else None
    if not isinstance(data, dict) or not isinstance(data.get("items"), list):
        return None
    items = []
    for it in data["items"]:
        if not isinstance(it, dict) or it.get("stage") not in STAGES or not it.get("name"):
            continue
        items.append({"id": it.get("id") or f"{it['stage']}__{it['name']}", "stage": it["stage"], "name": it["name"],
                      "state": STATES.get(it.get("status"), "todo"), "updated": it.get("updated"), "note": it.get("note") or ""})
    return {"items": items, "history": [h for h in data.get("history", []) if isinstance(h, dict)][-12:]}


def _run(settings, args):
    tool = settings.data["board"]["tool"]
    if not tool:
        raise BoardError("the board's command line (tablero.py) is not set in the local settings")
    cmd = [settings.python, tool] + args + ["--by", "command-room"]
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=30, encoding="utf-8", errors="replace", creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except (OSError, subprocess.TimeoutExpired) as err:
        raise BoardError(f"the board's command line could not be run: {err}")
    if res.returncode != 0:
        raise BoardError((res.stderr or res.stdout or "the board refused the change").strip().splitlines()[-1])
    return (res.stdout or "").strip()


def set_state(settings, stage, name, state):
    if stage not in STAGES:
        raise BoardError(f"the board has no stage called {stage}")
    if state not in TO_BOARD:
        raise BoardError(f"the board has no state for '{state}' (it knows to do, sent and done)")
    return _run(settings, ["set", stage, name, TO_BOARD[state]])


def add(settings, stage, name):
    if stage not in STAGES:
        raise BoardError(f"the board has no stage called {stage}")
    return _run(settings, ["add", stage, name])

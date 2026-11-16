"""Launchers: the ways to start a piece of work from Command Room.

A process is a kind of work (send jobs, follow them, collect results, fit, ShengBTE, train, compare, report).
A launcher is one concrete command that does it: one of the user's own scripts, with the fields it takes.
Launchers are described in a private file next to the settings (launchers.local.json). The user's guide
catalogue, when the settings name it, adds every other script as a launcher with one free command line.

Nothing in this module runs anything: it reads the descriptions and builds the exact command.

A launcher:
    {"id": "send-tree", "process": "send", "label": "Job tree to the cluster", "what": "one sentence",
     "shell": "bash" | "wsl" | "powershell", "cwd": "folder it runs in",
     "command": "bash send.sh submit {folder}{only}", "dry": "bash send.sh submit {folder}{only} --dry-run",
     "contacts": "id of the cluster the script logs in to by itself", "sends": true, "copy": false,
     "auto": {"every": 1800},
     "fields": [{"name": "folder", "label": "Folder", "required": true},
                {"name": "only", "label": "Only these", "format": " --only {value}"},
                {"name": "watch", "label": "Keep watching", "switch": " --watch"},
                {"name": "kind", "label": "Kind", "choices": ["a", "b"], "default": "a"},
                {"name": "line", "label": "Arguments", "raw": true}]}
"""
import os
import re
import shlex

from .settings import read_json

PROCESSES = [
    {"id": "send", "label": "Send jobs", "what": "Put calculations in a queue."},
    {"id": "follow", "label": "Follow jobs", "what": "See how sent work is going."},
    {"id": "collect", "label": "Collect results", "what": "Bring finished results to this computer."},
    {"id": "fit", "label": "Fit force constants", "what": "hiPhive fit from the forces."},
    {"id": "bte", "label": "ShengBTE", "what": "Thermal conductivity from the force constants."},
    {"id": "train", "label": "Train a potential", "what": "Train or refine a model on this computer."},
    {"id": "compare", "label": "Compare", "what": "Put two results side by side."},
    {"id": "report", "label": "Report", "what": "Write a figure, a table or a PDF."},
    {"id": "other", "label": "Other", "what": "Anything else you described."},
]
SHELLS = ("bash", "wsl", "powershell")
ON = ("1", "true", "on", "yes")


class LauncherError(Exception):
    pass


def _fields(raw):
    out = []
    for f in raw or []:
        if isinstance(f, dict) and re.fullmatch(r"[a-z][a-z0-9_]*", str(f.get("name") or "")):
            out.append({"name": f["name"], "label": str(f.get("label") or f["name"]), "default": str(f.get("default") or ""),
                        "required": bool(f.get("required")), "format": str(f.get("format") or "{value}"), "switch": str(f.get("switch") or ""),
                        "choices": [str(c) for c in f.get("choices") or []], "raw": bool(f.get("raw")), "help": str(f.get("help") or "")})
    return out


def _launcher(raw, known):
    if not isinstance(raw, dict) or not raw.get("id") or not raw.get("command"):
        return None
    shell = raw.get("shell") if raw.get("shell") in SHELLS else "bash"
    auto = raw.get("auto") if isinstance(raw.get("auto"), dict) else None
    return {"id": str(raw["id"]), "process": raw.get("process") if raw.get("process") in known else "other", "label": str(raw.get("label") or raw["id"]),
            "what": str(raw.get("what") or ""), "shell": shell, "cwd": str(raw.get("cwd") or ""), "command": str(raw["command"]), "dry": str(raw.get("dry") or ""),
            "contacts": str(raw.get("contacts") or ""), "sends": bool(raw.get("sends")), "copy": bool(raw.get("copy")),
            "auto": {"every": max(300, int(auto.get("every") or 1800)), "values": {str(k): str(v) for k, v in (auto.get("values") or {}).items()}} if auto else None,
            "fields": _fields(raw.get("fields")), "source": "yours"}


def load(path):
    """The processes and launchers of the private file; a missing file gives the processes and no launcher."""
    data = read_json(path) if path else None
    data = data if isinstance(data, dict) else {}
    processes = [dict(p) for p in PROCESSES]
    for p in data.get("processes") or []:
        if isinstance(p, dict) and p.get("id") and p["id"] not in {q["id"] for q in processes}:
            processes.insert(-1, {"id": str(p["id"]), "label": str(p.get("label") or p["id"]), "what": str(p.get("what") or "")})
    known = {p["id"] for p in processes}
    found, seen = [], set()
    for raw in data.get("launchers") or []:
        launcher = _launcher(raw, known)
        if launcher and launcher["id"] not in seen:
            seen.add(launcher["id"])
            found.append(launcher)
    return {"processes": processes, "launchers": found}


def _walk(node, section, out):
    if isinstance(node, dict):
        section = node.get("title") if "items" in node and node.get("title") else section
        if node.get("what") and node.get("name") and node.get("usage"):
            out.append({"name": str(node["name"]), "what": str(node["what"]), "where": str(node.get("where") or ""), "usage": str(node["usage"]),
                        "runs_on": str(node.get("runs_on") or ""), "notes": str(node.get("notes") or ""), "section": str(section or "")})
        for value in node.values():
            _walk(value, section, out)
    elif isinstance(node, list):
        for item in node:
            _walk(item, section, out)


def guide(path, clusters=()):
    """Every command of the user's guide catalogue as a launcher with one free command line.

    Where it runs is read from the entry's own words: WSL, PowerShell, a cluster named by its label (then the
    command is only shown, to be copied) or, otherwise, the shell of this computer.
    """
    data = read_json(path) if path else None
    entries, out, seen = [], [], set()
    _walk((data or {}).get("sections") if isinstance(data, dict) else None, "", entries)
    for e in entries:
        if e["name"] in seen:
            continue
        seen.add(e["name"])
        on = e["runs_on"].lower()
        cluster = next((c for c in clusters if c.get("label") and c["label"].lower() in on), None)
        here = any(w in on for w in ("pc", "windows", "wsl", "git bash", "powershell"))
        shell = "wsl" if "wsl" in on and "windows" not in on and "git bash" not in on and "pc" not in on else "powershell" if "powershell" in on and "wsl" not in on else "bash"
        folder = next((os.path.expanduser(p.strip()) for p in re.split(r"[,;]", e["where"]) if p.strip().startswith("~")), "")
        out.append({"id": "guide:" + e["name"], "process": "guide", "label": e["name"], "what": e["what"], "shell": shell, "cwd": folder.replace("\\", "/"),
                    "command": "{line}", "dry": "", "contacts": cluster["id"] if cluster else "", "sends": False, "copy": bool(cluster) and not here, "auto": None,
                    "fields": _fields([{"name": "line", "label": "Command line", "default": e["usage"].splitlines()[0].strip(), "required": True, "raw": True}]),
                    "source": "guide", "usage": e["usage"], "notes": e["notes"], "runs_on": e["runs_on"], "section": e["section"]})
    return out


def quote(value, shell):
    if shell == "powershell":
        return "'" + value.replace("'", "''") + "'"
    return shlex.quote(value)


def render(launcher, values, dry=False):
    """The exact command line of a launcher with these values; LauncherError says what is missing."""
    text = launcher["dry"] if dry else launcher["command"]
    if dry and not text:
        raise LauncherError("this launcher has no dry run")
    values = values or {}
    for f in launcher["fields"]:
        raw = str(values.get(f["name"], f["default"]) if values.get(f["name"]) not in (None, "") else f["default"]).strip()
        if "\n" in raw or "\r" in raw:
            raise LauncherError(f"{f['label']} must be one line")
        if f["switch"]:
            part = f["switch"] if raw.lower() in ON else ""
        elif not raw:
            if f["required"]:
                raise LauncherError(f"{f['label']} is needed")
            part = ""
        else:
            if f["choices"] and raw not in f["choices"]:
                raise LauncherError(f"{f['label']} must be one of: {', '.join(f['choices'])}")
            part = f["format"].replace("{value}", raw if f["raw"] else quote(raw, launcher["shell"]))
        text = text.replace("{" + f["name"] + "}", part)
    left = re.findall(r"\{([a-z][a-z0-9_]*)\}", text)
    if left and not any(f["raw"] for f in launcher["fields"]):
        raise LauncherError(f"the command of this launcher names a field it does not have: {left[0]}")
    return text.strip()


def public(launcher):
    """What the interface needs to draw a launcher: no command template is hidden, it is the user's own."""
    keys = ("id", "process", "label", "what", "shell", "cwd", "command", "dry", "contacts", "sends", "copy", "fields", "source", "usage", "notes", "runs_on", "section")
    out = {k: launcher[k] for k in keys if k in launcher}
    out["auto"] = bool(launcher.get("auto"))
    return out

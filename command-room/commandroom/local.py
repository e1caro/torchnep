"""Run the user's own commands on this computer.

Command Room starts a command here only from a plan the user has just confirmed (or, for a collector the user
switched on, from the automatic fetch). Every run gets a folder entry of its own: NAME.json with what was run
and how it ended, and NAME.log with everything it printed. The process is started without a console window
and with its whole tree in one group, so that Stop ends the script and whatever it started.
"""
import json
import os
import re
import shutil
import signal
import subprocess
import threading
import time

from .settings import read_json

WINDOWS = os.name == "nt"
TAIL = 6000


class LocalError(Exception):
    pass


def wsl_path(path):
    """C:/Users/me/x -> /mnt/c/Users/me/x; a path that is not a Windows drive path is returned as it is."""
    m = re.match(r"^([A-Za-z]):[\\/](.*)$", path or "")
    return f"/mnt/{m.group(1).lower()}/{m.group(2)}".replace("\\", "/") if m else (path or "")


def argv(settings, shell, command, cwd):
    """The program and arguments that run a command line in the given shell."""
    data = settings.data.get("shells") or {}
    if shell == "wsl":
        exe = data.get("wsl") or shutil.which("wsl.exe") or shutil.which("wsl")
        if not exe:
            raise LocalError("WSL was not found on this computer")
        line = (f"cd {quote(wsl_path(cwd))} && " if cwd else "") + command
        return [exe] + (["-d", data["wsl_distro"]] if data.get("wsl_distro") else []) + ["--", "bash", "-lc", line]
    if shell == "powershell":
        exe = data.get("powershell") or shutil.which("powershell.exe") or shutil.which("pwsh")
        if not exe:
            raise LocalError("PowerShell was not found on this computer")
        return [exe, "-NoProfile", "-NonInteractive", "-Command", command]
    exe = os.environ.get("COMMANDROOM_BASH") or data.get("bash") or _git_bash() or shutil.which("bash")
    if not exe:
        raise LocalError("no bash was found on this computer: give its path in the local settings (shells, bash)")
    return [exe, "-lc", command]


def quote(text):
    return "'" + text.replace("'", "'\\''") + "'"


def _git_bash():
    for path in (r"C:\Program Files\Git\bin\bash.exe", r"C:\Program Files (x86)\Git\bin\bash.exe"):
        if os.path.isfile(path):
            return path
    return None


def _env():
    env = dict(os.environ)
    env["CHERE_INVOKING"] = "1"
    env["PYTHONUNBUFFERED"] = "1"
    return env


def _popen(args, cwd, stdout):
    if cwd and not os.path.isdir(cwd):
        raise LocalError(f"the folder this runs in does not exist: {cwd}")
    kwargs = {"cwd": cwd or None, "stdin": subprocess.DEVNULL, "stdout": stdout, "stderr": subprocess.STDOUT, "env": _env()}
    if WINDOWS:
        kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True
    try:
        return subprocess.Popen(args, **kwargs)
    except OSError as err:
        raise LocalError(f"the command could not be started: {err}")


def _kill(proc):
    try:
        if WINDOWS:
            subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"], capture_output=True, timeout=20)
        else:
            os.killpg(proc.pid, signal.SIGTERM)
    except (OSError, subprocess.SubprocessError):
        try:
            proc.kill()
        except OSError:
            pass


def run_wait(settings, shell, command, cwd, timeout=180):
    """Run a short command (a dry run) and wait for it: (exit code, what it printed)."""
    proc = _popen(argv(settings, shell, command, cwd), cwd, subprocess.PIPE)
    try:
        out, _ = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        _kill(proc)
        proc.communicate()
        raise LocalError(f"the command did not finish in {timeout} s")
    return proc.returncode, out.decode("utf-8", errors="replace").replace("\r\n", "\n").strip()


class Runs:
    """The commands started from Command Room on this computer: start, list, read the output, stop."""

    def __init__(self, folder):
        self.folder = folder
        self.live = {}
        self.lock = threading.Lock()

    def _path(self, run_id, ext):
        return os.path.join(self.folder, run_id + ext)

    def _write(self, meta):
        tmp = self._path(meta["id"], ".json.tmp")
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=1)
        os.replace(tmp, self._path(meta["id"], ".json"))

    def start(self, settings, label, shell, command, cwd, origin="you", on_end=None):
        os.makedirs(self.folder, exist_ok=True)
        run_id = time.strftime("%Y%m%d_%H%M%S") + "_" + re.sub(r"[^A-Za-z0-9]+", "-", label).strip("-")[:40]
        with self.lock:
            while os.path.exists(self._path(run_id, ".json")):
                run_id += "x"
            log = open(self._path(run_id, ".log"), "wb")
            try:
                proc = _popen(argv(settings, shell, command, cwd), cwd, log)
            except LocalError:
                log.close()
                os.remove(self._path(run_id, ".log"))
                raise
            meta = {"id": run_id, "label": label, "shell": shell, "command": command, "cwd": cwd, "origin": origin, "started": time.time(),
                    "ended": None, "code": None, "state": "running", "pid": proc.pid}
            self._write(meta)
            self.live[run_id] = (proc, meta)

        def wait():
            code = proc.wait()
            log.close()
            with self.lock:
                self.live.pop(run_id, None)
                meta.update(ended=time.time(), code=code, state="stopped" if meta.get("stopping") else "done" if code == 0 else "failed")
                meta.pop("stopping", None)
                self._write(meta)
            if on_end:
                on_end(dict(meta))
        threading.Thread(target=wait, daemon=True).start()
        return dict(meta)

    def stop(self, run_id):
        with self.lock:
            entry = self.live.get(run_id)
            if not entry:
                raise LocalError("that run is not running any more")
            proc, meta = entry
            meta["stopping"] = True
        _kill(proc)
        return {"message": "Stopping it."}

    def tail(self, run_id, size=TAIL):
        if not re.fullmatch(r"[A-Za-z0-9_.-]+", run_id or ""):
            return ""
        try:
            with open(self._path(run_id, ".log"), "rb") as f:
                f.seek(0, os.SEEK_END)
                f.seek(max(0, f.tell() - size))
                return f.read().decode("utf-8", errors="replace").replace("\r\n", "\n").replace("\r", "\n")
        except OSError:
            return ""

    def listing(self, limit=30):
        """Newest first. A run recorded as running whose process is gone (the program was closed) is marked so."""
        if not os.path.isdir(self.folder):
            return []
        with self.lock:
            return self._listing(limit)

    def _listing(self, limit):
        out = []
        for name in sorted((n for n in os.listdir(self.folder) if n.endswith(".json")), reverse=True)[:limit]:
            meta = read_json(os.path.join(self.folder, name))
            if not isinstance(meta, dict) or "id" not in meta:
                continue
            if meta.get("state") == "running" and meta["id"] not in self.live:
                meta["state"] = "unknown"
            meta.pop("pid", None)
            lines = [line for line in self.tail(meta["id"], 600).split("\n") if line.strip()]
            meta["last"] = lines[-1][:200] if lines else ""
            out.append(meta)
        return out

    def log_path(self, run_id):
        path = self._path(run_id, ".log")
        return path if re.fullmatch(r"[A-Za-z0-9_.-]+", run_id or "") and os.path.isfile(path) else None

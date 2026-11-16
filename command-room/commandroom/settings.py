"""Local settings of Command Room.

Everything that is private (paths on this computer, host names, user names, cluster folders) lives in one
file that is never committed: settings.local.json, next to the package folder by default. The code only
knows generic names; the labels shown in the interface come from this file.
"""
import copy
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PATH = os.path.join(os.path.dirname(HERE), "settings.local.json")

DEFAULTS = {
    "port": 8791,
    "python": "",
    "board": {"data": "", "tool": ""},
    "hub": {"jobs": ""},
    "results": {"kappa": [], "runs": [], "elements": {}, "fetch_to": ""},
    "pipeline": "",
    "launchers": "",
    "guide": "",
    "local_runs": "",
    "shells": {},
    "clusters": [
        {"id": "torque", "label": "Torque cluster", "scheduler": "torque", "mode": "ssh", "enabled": False, "host": "", "user": "",
         "key": "", "known_hosts": "", "path_prefix": "", "data": "", "tools": "", "activate": "", "sender": "",
         "results": "", "auto_fetch": False, "fetch_files": []},
        {"id": "slurm", "label": "Slurm cluster", "scheduler": "slurm", "enabled": False, "host": "", "user": "",
         "key": "", "known_hosts": "", "path_prefix": "", "data": "", "tools": "", "activate": ""},
    ],
}


def read_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def write_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


class Settings:
    def __init__(self, path=None):
        self.path = os.path.abspath(path or DEFAULT_PATH)
        self.data = copy.deepcopy(DEFAULTS)
        self.seen = None
        self.load()

    def _stamp(self):
        try:
            return os.path.getmtime(self.path)
        except OSError:
            return None

    def reload_if_changed(self):
        """Read the file again when it was edited outside the program; True when it was."""
        if self._stamp() == self.seen:
            return False
        self.data = copy.deepcopy(DEFAULTS)
        self.load()
        return True

    def load(self):
        self.seen = self._stamp()
        stored = read_json(self.path)
        if isinstance(stored, dict):
            for key, value in stored.items():
                if key == "clusters" and isinstance(value, list):
                    self.data["clusters"] = [self._cluster(c) for c in value if isinstance(c, dict) and c.get("id")]
                elif isinstance(value, dict) and isinstance(self.data.get(key), dict):
                    self.data[key].update(value)
                else:
                    self.data[key] = value
        return self

    @staticmethod
    def _cluster(c):
        base = copy.deepcopy(DEFAULTS["clusters"][0])
        base.update({"id": c["id"], "label": c.get("label") or c["id"], "scheduler": c.get("scheduler", "torque")})
        base.update(c)
        return base

    def save(self):
        write_json(self.path, self.data)
        self.seen = self._stamp()

    def beside(self, name):
        return os.path.join(os.path.dirname(self.path), name)

    @property
    def launchers_path(self):
        return self.data.get("launchers") or self.beside("launchers.local.json")

    @property
    def runs_dir(self):
        return self.data.get("local_runs") or self.beside("runs")

    @property
    def python(self):
        return self.data.get("python") or sys.executable

    @property
    def pipeline_path(self):
        return self.data.get("pipeline") or os.path.join(os.path.dirname(self.path), "pipeline.local.json")

    def cluster(self, cluster_id):
        for c in self.data["clusters"]:
            if c["id"] == cluster_id:
                return c
        return None

    def public(self):
        """What the interface may see: labels and switches, never keys, hosts or user names."""
        return {
            "board": {"configured": bool(self.data["board"]["data"]), "writable": bool(self.data["board"]["tool"])},
            "hub": {"configured": bool(self.data["hub"]["jobs"])},
            "results": {"kappa": bool(self.data["results"]["kappa"]), "runs": bool(self.data["results"]["runs"])},
            "clusters": [{"id": c["id"], "label": c["label"], "scheduler": c["scheduler"], "enabled": bool(c["enabled"]),
                          "mode": c.get("mode", "ssh"), "configured": bool(c["host"] and c["user"]),
                          "auto_fetch": bool(c.get("auto_fetch")), "can_fetch": bool(c.get("results"))} for c in self.data["clusters"]],
        }

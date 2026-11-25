"""Jobs from the three places where work runs: this computer (the job files that ClaudeHub's jobtrack writes)
and the queues of the two clusters (Torque qstat, Slurm squeue).

Rules taken from ClaudeHub: a finished or failed job is shown for 5 minutes after it ended, then it only
stays in the history.
"""
import glob
import os
import re
import time

from .settings import read_json

DONE_HIDE_S = 300
FIELDS = ("name", "project", "total", "step", "metric", "phase", "state", "started", "updated", "cmd")


def local(folder, now=None):
    """Return {"live": [...], "history": [...]} from the job files, or None when the folder is not there."""
    if not folder or not os.path.isdir(folder):
        return None
    now = now or time.time()
    jobs = []
    for path in glob.glob(os.path.join(folder, "*.json")):
        job = read_json(path)
        if isinstance(job, dict) and job.get("name"):
            jobs.append({k: job.get(k) for k in FIELDS})
    jobs.sort(key=lambda j: j.get("updated") or 0)
    live = [j for j in jobs if j["state"] == "running" or now - (j.get("updated") or 0) <= DONE_HIDE_S]
    history = [j for j in jobs if j not in live][-30:]
    return {"live": live, "history": history[::-1]}


TORQUE_STATE = {"R": "running", "Q": "queued", "H": "held", "W": "queued", "E": "running", "C": "done", "T": "queued", "S": "held"}


def parse_qstat(text):
    """Jobs from `qstat -u USER` (Torque): id, user, queue, name, session, nodes, tasks, memory, limit, state, elapsed."""
    jobs = []
    for line in text.splitlines():
        p = line.split()
        if len(p) < 11 or not re.match(r"^\d+", p[0]):
            continue
        jobs.append({"id": p[0].split(".")[0], "name": p[3], "queue": p[2], "nodes": p[5], "limit": p[8],
                     "state": TORQUE_STATE.get(p[9], p[9]), "elapsed": p[10] if p[10] != "--" else ""})
    return jobs


SQUEUE_FORMAT = "%i|%j|%T|%M|%l|%D|%R"
SLURM_STATE = {"RUNNING": "running", "PENDING": "queued", "COMPLETING": "running", "CONFIGURING": "queued", "SUSPENDED": "held",
               "COMPLETED": "done", "FAILED": "failed", "CANCELLED": "failed", "TIMEOUT": "failed", "NODE_FAIL": "failed"}


def parse_squeue(text):
    """Jobs from `squeue -h -o "%i|%j|%T|%M|%l|%D|%R"` (Slurm)."""
    jobs = []
    for line in text.splitlines():
        p = line.strip().split("|")
        if len(p) < 7 or not p[0]:
            continue
        jobs.append({"id": p[0], "name": p[1], "state": SLURM_STATE.get(p[2], p[2].lower()), "elapsed": p[3], "limit": p[4],
                     "nodes": p[5], "where": p[6]})
    return jobs


def match_step(job_name, lanes, stages):
    """Guess which row a queue job belongs to from its name; None when nothing matches."""
    low = job_name.lower()
    best = None
    for lane in lanes:
        key = re.sub(r"[^a-z0-9]", "", lane["name"].lower())
        if key and key in re.sub(r"[^a-z0-9]", "", low) and (best is None or len(key) > len(best[1])):
            best = (lane["name"], key)
    return best[0] if best else None

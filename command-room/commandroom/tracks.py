"""Tracks: what was launched from Command Room, shown as rows of the pipeline.

A launcher may carry a "track" description. Every run started with that launcher then appears in the pipeline:
one row per piece of work (for example one row per model), under its material, in a group named after the
kind of work, with one step per process. The state of a step is read, never guessed. It comes from:
the run on this computer (running, ended well, failed), the queue jobs whose numbers the run printed
(queued, held, running, gone from the queue) and the result that came back to this computer.

A track:
    {"group": "Potentials to ShengBTE", "material": "C", "rows": "models", "row": "{row}", "potential": true,
     "skip": "== {row}: .*skipped",
     "steps": [{"stage": "vasp", "label": "Forces from the potential", "local": true, "until": "{row}: upload"},
               {"stage": "training", "label": "Fit", "jobs": "{row} fit (?P<id>\\d+)"},
               {"stage": "shengbte", "label": "ShengBTE", "parts": [
                   {"label": "least squares", "jobs": "{row} ls (?P<id>\\d+)", "result": "kappa:POT_{row}_ls"},
                   {"label": "RFE", "jobs": "{row} rfe (?P<id>\\d+)", "result": "kappa:POT_{row}_rfe"}]}]}

"rows" names the field whose values (separated by spaces) each make a row; without it the run makes one row.
Templates take {row} and the fields of the launcher: {folder}, {folder|base} (last part of a path),
{folder|material} (X from a path with X_data or DATA/X in it) and {material|or=Si} (Si when the field is empty).
A part with "awaits": true is only waiting for its result (for example calculations still to be collected).
"starts" is a pattern that, once printed, says the part has begun: until then it is waiting for its turn in the launch.
A launch the user ran by hand (a cluster Command Room never logs in to) is tracked too: its parts stay
"sent by you" until their result is on this computer. "jobs" is searched in what the run printed; its
group "id" is the job number and an optional group "part" names the part, so that one line per job makes one
part per job. "result" names what must be on this computer when the part is done: kappa:NAME (a ShengBTE
result folder), potential:NAME (a training run) or vasp:NAME (a folder of collected calculations).

Nothing in this module runs or connects to anything.
"""
import re
import shlex
import time

STAGE_WORD = {"todo": "not started", "sent": "under way", "done": "done", "failed": "failed"}
WAIT_FETCH_S = 20


def spec(launcher):
    """The checked track of a launcher, or None when it has none that can be used."""
    raw = launcher.get("track")
    if not isinstance(raw, dict) or not isinstance(raw.get("steps"), list):
        return None
    steps = []
    for s in raw["steps"]:
        if not isinstance(s, dict) or not s.get("stage"):
            continue
        parts = [p for p in s.get("parts") or [] if isinstance(p, dict)] or [s]
        steps.append({"stage": str(s["stage"]), "label": str(s.get("label") or ""),
                      "parts": [{"label": str(p.get("label") or ""), "local": bool(p.get("local")), "until": str(p.get("until") or ""),
                                 "jobs": str(p.get("jobs") or ""), "result": str(p.get("result") or ""), "awaits": bool(p.get("awaits")),
                                 "starts": str(p.get("starts") or "")} for p in parts]})
    if not steps:
        return None
    return {"group": str(raw.get("group") or launcher.get("label") or "Launched"), "material": str(raw.get("material") or ""),
            "rows": str(raw.get("rows") or ""), "row": str(raw.get("row") or "{row}"), "potential": bool(raw.get("potential")),
            "skip": str(raw.get("skip") or ""), "steps": steps}


def unrender(launcher, command):
    """The field values behind a command line that was built from this launcher; {} when it does not fit."""
    pattern, names = "", []
    for piece in re.split(r"(\{[a-z][a-z0-9_]*\})", launcher.get("command") or ""):
        if re.fullmatch(r"\{[a-z][a-z0-9_]*\}", piece) and piece[1:-1] not in names:
            names.append(piece[1:-1])
            pattern += f"(?P<{piece[1:-1]}>.*?)"
        else:
            pattern += re.escape(piece)
    m = re.fullmatch(r"\s*" + pattern + r"\s*", command or "", re.S)
    if not m:
        return {}
    out = {}
    for name in names:
        try:
            out[name] = " ".join(shlex.split(m.group(name)))
        except ValueError:
            out[name] = m.group(name).strip()
    return out


def material_in(path):
    """C:/x/Si_data/Set1 -> Si; /work/DATA/MgO/all -> MgO; '' when the path does not say."""
    text = (path or "").replace("\\", "/")
    m = re.search(r"(?:^|/)([A-Za-z][A-Za-z0-9]*)_data(?:/|$)", text) or re.search(r"/DATA/([A-Za-z][A-Za-z0-9]*)(?:/|$)", text)
    return m.group(1) if m else ""


def fill(template, values, regex=False):
    """Put the values into a template. In a search pattern every value is taken literally."""
    def one(m):
        name, how, arg = m.group(1), m.group(2), m.group(3)
        value = str(values.get(name, ""))
        if how == "base":
            value = value.replace("\\", "/").rstrip("/").rsplit("/", 1)[-1]
        elif how == "material":
            value = material_in(value)
        elif how == "or":
            value = value.strip() or (arg or "")
        return re.escape(value) if regex else value
    return re.sub(r"\{([a-z][a-z0-9_]*)(?:\|([a-z]+)(?:=([^{}]*))?)?\}", one, template or "")


def _search(pattern, text):
    try:
        return list(re.finditer(pattern, text, re.M))
    except re.error:
        return []


def _job(job_id, cluster, queues, after, gone):
    """(state, queue job): queued, held, running, gone, or unknown when the queue cannot tell yet."""
    q = queues.get(cluster) or {}
    key = f"{cluster}:{job_id}"
    if q.get("jobs") is None:
        return "unknown", None
    found = next((j for j in q["jobs"] if str(j.get("id")) == str(job_id)), None)
    if found and found.get("state") in ("queued", "held", "running"):
        gone.pop(key, None)
        return found["state"], found
    if not found and (after is None or (q.get("read") or 0) < after):
        return "unknown", None
    gone.setdefault(key, q.get("read") or time.time())
    return "gone", found


def _part(p, values, meta, log, cluster, queues, gone, fetched_at, result_of):
    """One part of a step as the interface shows it: state, a word for it, its job and its result."""
    run = meta.get("state")
    ended = run != "running"
    hand = run == "byhand"
    result = result_of(fill(p["result"], values)) if p["result"] else None
    out = {"label": p["label"], "job": None, "cluster": None, "state": "todo", "word": "", "elapsed": "", "result": result, "wants": fill(p["result"], values)}
    if p["awaits"]:
        out.update(state="done" if result else "todo", word="on this computer" if result else "not on this computer yet")
        return [out]
    if hand:
        out.update(state="done" if result or (p["local"] and not p["result"]) else "sent",
                   word="the result is on this computer" if result else "run by you" if p["local"] and not p["result"] else "sent by you; Command Room cannot see how it is going")
        return [out]
    if p["local"]:
        reached = bool(p["until"]) and bool(_search(fill(p["until"], values, True), log))
        if reached or run == "done":
            out.update(state="done", word="done on this computer")
        elif run == "running":
            out.update(state="sent", word="running on this computer")
        else:
            out.update(state="failed", word={"stopped": "stopped before it got here", "unknown": "the program was closed while it ran"}.get(run, "failed on this computer"))
        return [out]
    if p["jobs"]:
        found = _search(fill(p["jobs"], values, True), log)
        parts = []
        for m in found:
            groups = m.groupdict()
            job_id = (groups.get("id") or (m.group(1) if m.groups() else "")).split(".")[0]
            if not job_id:
                continue
            one = dict(out, job=job_id, cluster=cluster, label=groups.get("part") or p["label"])
            if groups.get("part") and p["result"]:
                one["wants"] = fill(p["result"], dict(values, part=groups["part"]))
                one["result"] = result_of(one["wants"])
            state, job = _job(job_id, cluster, queues, meta.get("ended") if ended else None, gone)
            if one["result"]:
                one.update(state="done", word="done, the result is on this computer")
            elif state in ("queued", "held", "running"):
                one.update(state="sent", word={"held": "held until the job before it ends"}.get(state, state), elapsed=(job or {}).get("elapsed") or "")
            elif state == "unknown":
                one.update(state="sent", word="sent; the queue has not been read since")
            elif not p["result"]:
                one.update(state="done", word="left the queue")
            elif fetched_at.get(cluster, 0) > gone.get(f"{cluster}:{job_id}", float("inf")) + WAIT_FETCH_S:
                one.update(state="failed", word="left the queue and no result came back")
            else:
                one.update(state="sent", word="left the queue; waiting for its result to be fetched")
            parts.append(one)
        if parts:
            return parts
        if result:
            return [dict(out, state="done", word="the result is on this computer")]
        if not ended:
            return [dict(out, state="todo", word="the launch has not queued it yet")]
        return [dict(out, state="failed", word="the launch ended without queueing it")]
    begun = not p["starts"] or bool(_search(fill(p["starts"], values, True), log))
    if result:
        out.update(state="done", word="the result is on this computer")
    elif not ended:
        out.update(state="sent" if begun else "todo", word="running on this computer" if begun else "waiting for its turn in this launch")
    elif not begun:
        out.update(state="failed", word="the launch ended before it got to this one")
    elif run == "done":
        out.update(state="failed" if p["result"] else "done", word="ended, but its result is not on this computer" if p["result"] else "done on this computer")
    else:
        out.update(state="failed", word="failed on this computer")
    return [out]


BRIEF = (("queued", "queued"), ("held", "held"), ("running", "running"), ("sent by you", "by you"), ("sent;", "sent"), ("left the queue; waiting", "fetching"),
         ("left the queue and no", "no result"), ("the launch has not", "waiting"), ("waiting for its turn", "waiting"), ("the launch ended before", "not started"), ("the launch ended", "not queued"), ("not on this computer yet", "to collect"),
         ("ended, but", "no result"), ("stopped", "stopped"))


def _brief(part):
    """Two words at most, to write under the lamp of the step."""
    if part["state"] == "done":
        return (part["result"] or {}).get("short") or ""
    return next((short for start, short in BRIEF if part["word"].startswith(start)), "failed" if part["state"] == "failed" else "")


def _together(parts):
    states = [p["state"] for p in parts]
    return "failed" if "failed" in states else "done" if all(s == "done" for s in states) else "sent" if any(s in ("sent", "done") for s in states) else "todo"


def _sentence(label, parts):
    said = []
    for p in parts:
        text = (p["label"] + ": " if p["label"] and p["label"] != label else "") + (f"job {p['job']}, " if p["job"] else "") + p["word"]
        if p["result"] and p["result"].get("text"):
            text += f" ({p['result']['text']})"
        said.append(text)
    return "; ".join(said) + "." if said else ""


def build(runs, launchers, queues, read_log, result_of, gone, fetched_at=None):
    """The tracked rows, newest launch first. A piece of work launched twice is shown once, from its newest launch."""
    by_id = {x["id"]: x for x in launchers}
    by_label = {x["label"]: x for x in launchers}
    rows, seen = [], set()
    for meta in sorted(runs, key=lambda r: r.get("started") or 0, reverse=True):
        launcher = by_id.get(meta.get("launcher")) or (by_label.get(meta.get("label")) if not meta.get("launcher") else None)
        track = spec(launcher) if launcher else None
        if not track or meta.get("origin") == "automatic":
            continue
        values = dict(meta.get("values") or unrender(launcher, meta.get("command")))
        log = read_log(meta["id"]) or ""
        names = values.get(track["rows"], "").split() if track["rows"] else [None]
        for item in names:
            ctx = dict(values, row=item or "")
            name = fill(track["row"], ctx).strip() or item or launcher["label"]
            ctx["row"] = name if item is None else item
            material = fill(track["material"], ctx).strip()
            key = (track["group"], material, name)
            if key in seen:
                continue
            if track["skip"] and _search(fill(track["skip"], ctx, True), log):
                continue
            seen.add(key)
            steps = []
            for s in track["steps"]:
                parts = [q for p in s["parts"] for q in _part(p, ctx, meta, log, launcher.get("contacts") or "", queues, gone, fetched_at or {}, result_of)]
                label = fill(s["label"], ctx)
                for part in parts:
                    part["brief"] = _brief(part)
                steps.append({"stage": s["stage"], "label": label, "state": _together(parts), "parts": parts, "says": _sentence(label, parts)})
            rows.append({"id": f"{meta['id']}::{name}", "name": name, "material": material, "group": track["group"], "potential": track["potential"],
                         "run": meta["id"], "run_state": meta.get("state"), "launcher": launcher["label"], "launcher_id": launcher["id"],
                         "started": meta.get("started"), "command": meta.get("command") or "", "steps": steps})
    return rows


def job_rows(rows):
    """{"cluster:job": row name}, to say which row a queue job belongs to."""
    out = {}
    for row in rows:
        for step in row["steps"]:
            for part in step["parts"]:
                if part["job"]:
                    out[f"{part['cluster']}:{part['job']}"] = row["name"]
    return out

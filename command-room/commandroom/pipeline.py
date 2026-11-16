"""The pipeline: processes (columns), rows (materials and variants) and steps, with the rules that say what
can be launched now.

The steps of the three board stages come from the work board. Everything else (extra processes, extra rows,
steps added here, what is hidden) is kept in Command Room's own file, the store. Rules are fixed code, not a
language model, so the same board always gives the same answer.
"""
import copy
import re
import time

from .settings import read_json, write_json

BUILTIN = [{"id": "vasp", "label": "VASP"}, {"id": "training", "label": "Training"}, {"id": "shengbte", "label": "ShengBTE"}]
ROOM_STATES = ("todo", "sent", "done", "failed")
WORD = {"todo": "to do", "sent": "sent", "done": "done", "failed": "failed"}


class PipelineError(Exception):
    pass


def default_store():
    return {"stages": copy.deepcopy(BUILTIN), "removed": [], "parents": {}, "polar": [], "potential": [], "lanes": [],
            "steps": [], "hidden": {"lanes": [], "steps": []}, "folders": {}}


def load(path):
    store = default_store()
    stored = read_json(path)
    if isinstance(stored, dict):
        store.update(stored)
        hidden = {"lanes": [], "steps": []}
        hidden.update(stored.get("hidden") or {})
        store["hidden"] = hidden
    return store


def save(path, store):
    write_json(path, store)


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-") or "x"


def _steps(board, store):
    hidden_steps, hidden_lanes = set(store["hidden"]["steps"]), set(store["hidden"]["lanes"])
    stage_ids = {s["id"] for s in store["stages"]}
    out = []
    for it in (board or {}).get("items", []):
        out.append(dict(it, source="board"))
    for it in store["steps"]:
        out.append(dict(it, source="room"))
    return [s for s in out if s["id"] not in hidden_steps and s["name"] not in hidden_lanes and s["stage"] in stage_ids]


def _parent(name, names, store):
    if name in store["parents"]:
        parent = store["parents"][name]
        return parent if parent in names else None
    best = None
    for m in names:
        if m != name and name.startswith(m) and re.match(r"[\sA-Z]", name[len(m):len(m) + 1] or "") and (best is None or len(m) > len(best)):
            best = m
    return best


def view(board, store):
    """Everything the interface draws: stages, rows, steps with their rule, and the list of open steps."""
    steps = _steps(board, store)
    hidden_lanes = set(store["hidden"]["lanes"])
    names = []
    for n in [s["name"] for s in steps] + list(store["lanes"]):
        if n not in names and n not in hidden_lanes:
            names.append(n)
    parent = {n: _parent(n, names, store) for n in names}
    lanes = []
    for n in names:
        if not parent[n]:
            lanes.append({"name": n, "parent": None})
            lanes.extend({"name": v, "parent": n} for v in names if parent[v] == n)
    order = [s["id"] for s in store["stages"]]
    label = {s["id"]: s["label"] for s in store["stages"]}
    at = {(s["name"], s["stage"]): s for s in steps}
    def polar(n):
        return (parent.get(n) or n) in store["polar"]

    for lane in lanes:
        lane["polar"] = polar(lane["name"])
        lane["potential"] = lane["name"] in store["potential"]
        lane["folder"] = store["folders"].get(lane["name"], "")
    for s in steps:
        s.update(view=s["state"], kind=None, rule="", prev=None, via_parent=False)
        i, prev, via = order.index(s["stage"]), None, False
        for j in range(i - 1, -1, -1):
            prev = at.get((s["name"], order[j]))
            if not prev and parent.get(s["name"]) and s["name"] not in store["potential"]:
                prev = at.get((parent[s["name"]], order[j]))
                via = prev is not None
            if prev:
                break
        s["prev"], s["via_parent"] = (prev["id"] if prev else None), via
        if s["state"] != "todo":
            continue
        if not prev:
            s["kind"], s["rule"] = "ready", "First step of this row: nothing has to finish before it."
        elif prev["state"] != "done":
            s["kind"], s["view"] = "waiting", "waiting"
            s["rule"] = f"Waits for {label[prev['stage']]} of {prev['name']} ({WORD[prev['state']]})."
        elif via:
            s["kind"], s["view"] = "attention", "attention"
            s["rule"] = (f"{label[prev['stage']]} of {prev['name']} is done, but this row has no {label[prev['stage']]} step of its own. "
                         f"Check that this variant's {label[prev['stage']]} exists before launching.")
        else:
            s["kind"], s["rule"] = "ready", f"{label[prev['stage']]} of {prev['name']} is done."
        if polar(s["name"]) and s["stage"] == "training":
            s["rule"] += " Polar: needs the Born-charge run and --lr in the fit."
        if polar(s["name"]) and s["stage"] == "shengbte":
            s["rule"] += " Polar: needs polar = yes and Born charges in CONTROL."
    rank = {"ready": 0, "attention": 1, "waiting": 2}
    todo = sorted((s for s in steps if s["kind"]), key=lambda s: rank[s["kind"]])
    return {"stages": store["stages"], "lanes": lanes, "steps": steps, "next": [s["id"] for s in todo],
            "counts": {k: sum(1 for s in todo if s["kind"] == k) for k in rank},
            "hidden": store["hidden"], "removed": store.get("removed", [])}


def _now():
    return time.strftime("%Y-%m-%dT%H:%M:%S")


def apply(store, op, a):
    """Change the store in place and return a sentence that says what was done."""
    stages = store["stages"]
    if op == "add_stage":
        name = (a.get("label") or "").strip()[:24]
        if not name:
            raise PipelineError("give the process a name")
        if any(s["label"].lower() == name.lower() for s in stages):
            raise PipelineError(f"there is already a process called {name}")
        old = next((s for s in store["removed"] if s["label"].lower() == name.lower()), None)
        stage = old or {"id": f"x-{slug(name)}-{int(time.time() * 1000):x}", "label": name}
        if old:
            store["removed"].remove(old)
        after = a.get("after", "__end")
        index = len(stages) if after == "__end" else 0 if after == "__start" else next((i + 1 for i, s in enumerate(stages) if s["id"] == after), len(stages))
        stages.insert(index, stage)
        return f"Added the process {stage['label']}."
    if op in ("remove_stage", "move_stage", "rename_stage", "stage_command"):
        i = next((i for i, s in enumerate(stages) if s["id"] == a.get("id")), None)
        if i is None:
            raise PipelineError("that process does not exist")
        if op == "remove_stage":
            stage = stages.pop(i)
            store["removed"] = [s for s in store["removed"] if s["id"] != stage["id"]] + [stage]
            return f"Removed the process {stage['label']}. Its steps are kept and return if you add it again."
        if op == "rename_stage":
            name = (a.get("label") or "").strip()[:24]
            if not name:
                raise PipelineError("give the process a name")
            stages[i]["label"] = name
            return f"Renamed the process to {name}."
        if op == "stage_command":
            stages[i]["command"] = (a.get("command") or "").strip()
            return f"Saved the command of {stages[i]['label']}."
        j = i + (-1 if a.get("direction") == "left" else 1)
        if not 0 <= j < len(stages):
            raise PipelineError("it is already at the edge")
        stages[i], stages[j] = stages[j], stages[i]
        return "Moved the process."
    if op == "add_lane":
        name = (a.get("name") or "").strip()[:24]
        if not name:
            raise PipelineError("give the row a name")
        if name in store["hidden"]["lanes"]:
            store["hidden"]["lanes"].remove(name)
        if name not in store["lanes"]:
            store["lanes"].append(name)
        store["parents"][name] = (a.get("parent") or "").strip()
        return f"Added the row {name}. Use the + in its row to add steps."
    if op == "remove_lane":
        name = a.get("name")
        if name not in store["hidden"]["lanes"]:
            store["hidden"]["lanes"].append(name)
        store["lanes"] = [x for x in store["lanes"] if x != name]
        return f"Removed the row {name}. The work board is not changed."
    if op == "lane_props":
        name = a.get("name")
        for key in ("polar", "potential"):
            if key in a:
                store[key] = [x for x in store[key] if x != name] + ([name] if a[key] else [])
        if "folder" in a:
            store["folders"][name] = (a["folder"] or "").strip()
        if "parent" in a:
            store["parents"][name] = (a["parent"] or "").strip()
        return f"Saved the settings of {name}."
    if op == "show_lane":
        store["hidden"]["lanes"] = [x for x in store["hidden"]["lanes"] if x != a.get("name")]
        return f"Brought back {a.get('name')}."
    if op == "show_steps":
        store["hidden"]["steps"] = []
        return "Brought back the hidden steps."
    if op == "add_step":
        if a.get("stage") not in {s["id"] for s in stages}:
            raise PipelineError("that process does not exist")
        name = (a.get("name") or "").strip()
        if not name:
            raise PipelineError("the step needs a row")
        step = {"id": f"room__{slug(a['stage'])}__{slug(name)}__{int(time.time() * 1000):x}", "stage": a["stage"], "name": name,
                "state": "todo", "updated": _now(), "note": ""}
        store["steps"].append(step)
        return "Added a step."
    if op in ("set_state", "set_note", "remove_step"):
        step = next((s for s in store["steps"] if s["id"] == a.get("id")), None)
        if op == "remove_step":
            if step:
                store["steps"].remove(step)
                return "Removed the step."
            if a.get("id") and a["id"] not in store["hidden"]["steps"]:
                store["hidden"]["steps"].append(a["id"])
            return "Hid the step here. The work board is not changed."
        if not step:
            raise PipelineError("only steps added in Command Room can be changed here")
        if op == "set_note":
            step["note"] = (a.get("note") or "").strip()[:400]
        else:
            if a.get("state") not in ROOM_STATES:
                raise PipelineError("unknown state")
            step["state"] = a["state"]
        step["updated"] = _now()
        return "Saved."
    raise PipelineError(f"unknown change: {op}")

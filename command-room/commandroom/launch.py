"""Launch: turn a step of the pipeline into the exact command of the user's tools, show it, dry-run it, and
send it only with a confirmation that belongs to that very command.

The three board stages use hipipe. Any other process uses the command the user wrote for it. Nothing in this
module decides to send work by itself: `prepare` gives a plan and a one-time token, `submit` needs that token.
"""
import os
import re
import secrets
import shlex
import time

from . import launchers, local, remote

ACTIONS = {
    "vasp": [
        {"id": "pre", "label": "Make the displaced structures", "args": "pre --n {n}", "mode": "dry", "fields": ["n"]},
        {"id": "vasp", "label": "Send VASP for every structure", "args": "vasp", "mode": "submit",
         "warn": "Needs vasp_cmd in hipipe.cfg. If you send VASP with your own job script, use that instead."},
        {"id": "check", "label": "Check that every job finished", "args": "check", "mode": "read"},
    ],
    "training": [
        {"id": "check", "label": "Check the VASP results", "args": "check", "mode": "read"},
        {"id": "shells", "label": "Choose the cutoffs by shell", "args": "shells{c3}{c4} --write", "mode": "dry", "fields": ["c3", "c4"]},
        {"id": "fit", "label": "Fit the force constants", "args": "fit", "mode": "submit"},
    ],
    "shengbte": [
        {"id": "bte", "label": "Prepare and send ShengBTE", "args": "bte", "mode": "submit"},
    ],
}
PLAN_LIFE_S = 900
_plans = {}


class LaunchError(Exception):
    pass


def actions(stage):
    """The actions a stage offers; a process added by the user has one action, its own command."""
    if stage["id"] in ACTIONS:
        return [dict(a) for a in ACTIONS[stage["id"]]]
    if stage.get("command"):
        return [{"id": "run", "label": f"Run {stage['label']}", "args": stage["command"], "mode": "custom"}]
    return []


def _number(value, name, integer=False):
    try:
        number = int(value) if integer else float(value)
    except (TypeError, ValueError):
        raise LaunchError(f"{name} must be a number")
    if number <= 0:
        raise LaunchError(f"{name} must be greater than 0")
    return number


def command(cluster, stage, action, fields, polar=False):
    """Return (command for a dry run or None, command that really runs, notes)."""
    notes = []
    if action["mode"] == "custom":
        return None, action["args"], ["This process is yours: Command Room cannot dry-run it, it shows the command and waits."]
    tools = (cluster.get("tools") or "").rstrip("/")
    if not tools:
        raise LaunchError(f"the tools folder of {cluster['label']} is not in the local settings")
    args = action["args"]
    if "{n}" in args:
        args = args.replace("{n}", str(_number(fields.get("n"), "The number of structures", integer=True)))
    for key in ("c3", "c4"):
        token = "{" + key + "}"
        if token in args:
            value = fields.get(key)
            args = args.replace(token, f" --{key} {_number(value, key)}" if value not in (None, "") else "")
    base = f"python {shlex.quote(tools + '/hipipe.py')} {args}"
    if action.get("warn"):
        notes.append(action["warn"])
    if polar and stage["id"] == "training" and action["id"] == "fit":
        notes.append("Polar material: hipipe does not add --lr. After the dry run, --lr must be added to the python line of train.job before it is sent.")
    if polar and stage["id"] == "vasp" and action["id"] == "pre":
        notes.append("Polar material: the Born-charge run (CALC_LR) is made by the wrapper with -m pre ... --lr, not by hipipe.")
    if polar and stage["id"] == "shengbte":
        notes.append("Polar material: hipipe.cfg needs polar = yes and CONTROL needs born(, epsilon( and nonanalytic=.TRUE.")
    if action["mode"] == "read":
        return None, base, notes
    if action["mode"] == "dry":
        return base + " --dry-run", base, notes
    return base + " --dry-run", base + " --submit", notes


def prepare(settings, cluster_id, folder, stage, action_id, fields, polar=False, step_id=None):
    cluster = settings.cluster(cluster_id)
    if not cluster:
        raise LaunchError("choose where this runs")
    if not folder or not folder.startswith("/"):
        raise LaunchError("give the calculation folder on the cluster (a full path)")
    action = next((a for a in actions(stage) if a["id"] == action_id), None)
    if not action:
        raise LaunchError("that action does not exist for this process")
    dry, real, notes = command(cluster, stage, action, fields or {}, polar)
    token = secrets.token_urlsafe(16)
    now = time.time()
    for key in [k for k, p in _plans.items() if now - p["made"] > PLAN_LIFE_S]:
        del _plans[key]
    plan = {"token": token, "made": now, "cluster": cluster_id, "where": cluster["label"], "folder": folder, "stage": stage["id"],
            "action": action["id"], "label": action["label"], "mode": action["mode"], "dry": dry, "real": real, "notes": notes,
            "step": step_id, "dry_output": None, "dry_ok": None, "manual": cluster.get("mode") == "manual",
            "copy_dry": remote.tool_script(cluster, folder, dry) if dry else None, "copy_real": remote.tool_script(cluster, folder, real)}
    _plans[token] = plan
    return plan


def prepare_local(settings, launcher, values, step_id=None):
    """A plan for one of the user's own launchers. It runs on this computer, or is only shown to be copied."""
    try:
        real = launchers.render(launcher, values)
        dry = launchers.render(launcher, values, dry=True) if launcher["dry"] else None
    except launchers.LauncherError as err:
        raise LaunchError(str(err))
    notes, manual, where = [], bool(launcher["copy"]), "this computer"
    cluster = settings.cluster(launcher["contacts"]) if launcher["contacts"] else None
    if launcher["contacts"] and not cluster:
        notes.append("The cluster this launcher names is not in the local settings.")
    if cluster and cluster.get("mode") == "manual":
        manual = True
        notes.append(f"{cluster['label']} is run by you: copy the command and run it in your own terminal. Command Room never logs in there.")
    elif cluster and manual:
        where = cluster["label"]
        notes.append(f"This command runs on {cluster['label']}: copy it and run it there, in the folder of the calculation.")
    elif cluster and not cluster.get("enabled"):
        raise LaunchError(f"{cluster['label']} is switched off: switch it on in Jobs before starting something that connects to it")
    elif cluster:
        notes.append(f"This script connects to {cluster['label']} by itself.")
    if launcher["sends"] and not dry:
        notes.append("This launcher sends work and has no dry run: read the command before you start it.")
    if launcher["cwd"] and not manual and not os.path.isdir(launcher["cwd"]):
        raise LaunchError(f"the folder this launcher runs in does not exist: {launcher['cwd']}")
    here = f"cd {local.quote(launcher['cwd'])} && " if launcher["cwd"] and where == "this computer" else ""
    token = secrets.token_urlsafe(16)
    now = time.time()
    for key in [k for k, p in _plans.items() if now - p["made"] > PLAN_LIFE_S]:
        del _plans[key]
    plan = {"token": token, "made": now, "kind": "local", "launcher": launcher["id"], "label": launcher["label"], "process": launcher["process"],
            "cluster": launcher["contacts"], "where": where, "folder": launcher["cwd"], "shell": launcher["shell"], "stage": None, "action": launcher["id"],
            "mode": "submit" if launcher["sends"] else "run", "sends": bool(launcher["sends"]), "dry": dry, "real": real, "notes": notes, "step": step_id,
            "dry_output": None, "dry_ok": None, "manual": manual, "copy_dry": here + dry if dry else None, "copy_real": here + real,
            "values": {str(k): str(v) for k, v in (values or {}).items()}}
    _plans[token] = plan
    return plan


def take_local(token, confirm):
    """Hand over a confirmed plan of this computer so that the server can start it; the plan is used up."""
    plan = _plans.get(token)
    if not plan or confirm != token or plan.get("kind") != "local":
        raise LaunchError("this plan has expired or was not confirmed: prepare it again")
    if plan["manual"]:
        raise LaunchError("this command is run by you: copy it")
    if plan["sends"] and plan["dry"] and plan["dry_ok"] is not True:
        raise LaunchError("run the dry run first and read what it would do")
    del _plans[token]
    return plan


BAD_OUTPUT = re.compile(r"(?im)^\s*(error|traceback)\b|command not found|no such file or directory|permission denied")


def pasted(token, text):
    """The user ran the dry run himself and pasted what it printed: keep it with the plan and judge it."""
    plan = _plans.get(token)
    if not plan:
        raise LaunchError("this plan has expired: prepare it again")
    text = (text or "").strip()
    if not text:
        raise LaunchError("paste what the command printed")
    plan["dry_output"], plan["dry_ok"] = text[:20000], not BAD_OUTPUT.search(text)
    return plan


def sent(token):
    """The user sent the real command himself: close the plan."""
    plan = _plans.get(token)
    if not plan:
        raise LaunchError("this plan has expired: prepare it again")
    if not plan["manual"]:
        raise LaunchError("this cluster is sent from Command Room: use the send button")
    if plan["dry"] and plan["dry_ok"] is not True and plan.get("sends", True):
        raise LaunchError("paste the output of the dry run first")
    del _plans[token]
    return plan


def dry_run(settings, token):
    plan = _plans.get(token)
    if not plan:
        raise LaunchError("this plan has expired: prepare it again")
    if plan["manual"]:
        raise LaunchError(f"{plan['where']} is run by you: copy the command, run it there and paste what it printed")
    cmd = plan["dry"] or (plan["real"] if plan["mode"] == "read" else None)
    if not cmd:
        raise LaunchError("this process has no dry run")
    if plan.get("kind") == "local":
        try:
            code, out = local.run_wait(settings, plan["shell"], cmd, plan["folder"])
        except local.LocalError as err:
            raise LaunchError(str(err))
        plan["dry_output"], plan["dry_ok"] = out[-20000:], code == 0 and not BAD_OUTPUT.search(out)
        return plan
    code, out = remote.run_tool(settings, plan["cluster"], plan["folder"], cmd)
    plan["dry_output"], plan["dry_ok"] = out.strip(), code == 0
    return plan


def submit(settings, token, confirm):
    """Run the real command of a plan. `confirm` must be the plan's token typed back by the user's click."""
    plan = _plans.get(token)
    if not plan or confirm != token:
        raise LaunchError("this plan has expired or was not confirmed: prepare it again")
    if plan["manual"]:
        raise LaunchError(f"{plan['where']} is run by you: Command Room never sends anything there")
    if plan["mode"] == "read":
        raise LaunchError("this action only reads: use the dry run")
    if plan["dry"] and plan["dry_ok"] is not True:
        raise LaunchError("run the dry run first and read what it would do")
    code, out = remote.run_tool(settings, plan["cluster"], plan["folder"], plan["real"], timeout=600)
    del _plans[token]
    return {"ok": code == 0, "output": out.strip(), "plan": plan}

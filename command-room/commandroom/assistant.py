"""The assistant: Claude, through the Claude Code that is already installed on this computer with the user's
own login (no API key). It is called only when the user asks a question, because every question uses the
user's quota. It gets no tools: it can read what Command Room hands it and nothing else, and it cannot run
or send anything.
"""
import glob
import json
import os
import subprocess

from . import library

SYSTEM = (
    "You are the assistant inside Command Room, a program a materials scientist uses to run VASP, hiPhive and "
    "ShengBTE calculations and to train potentials. Answer only from the context you are given: the state of the "
    "pipeline, the selected step, the state of the clusters and the Library pages. After each statement say where "
    "it comes from (for example: Library, 'Polar materials'; or: pipeline, Training of PbTe). If the context does "
    "not hold the answer, say so plainly and say what would be needed. Never invent a number, a path or a result. "
    "You cannot run commands, read files or send jobs; when the user wants something done, tell them which area "
    "of Command Room does it (Overview, Launch, Jobs, Results, Reports, Library). Use short sentences and plain "
    "words. Answer in the language of the question."
)


class AssistantError(Exception):
    pass


def find_claude(settings):
    explicit = os.environ.get("COMMANDROOM_CLAUDE") or settings.data.get("claude")
    if explicit:
        return explicit if os.path.isfile(explicit) else None
    found = glob.glob(os.path.join(os.environ.get("LOCALAPPDATA", ""), "Claude-Data", "*", "claude-code", "*", "*", "claude.exe"))
    found += glob.glob(os.path.join(os.environ.get("APPDATA", ""), "Claude", "claude-code", "*", "*", "claude.exe"))
    return max(found, key=os.path.getmtime) if found else None


def context(view, clusters, local, step_id):
    """What the assistant may see: no paths, no hosts, only names, states and rules."""
    label = {s["id"]: s["label"] for s in view["stages"]}
    steps = [{"process": label.get(s["stage"], s["stage"]), "row": s["name"], "state": s["view"], "rule": s["rule"], "from": s["source"]} for s in view["steps"]]
    selected = next((x for s, x in zip(view["steps"], steps) if s["id"] == step_id), None)
    return {
        "processes": [s["label"] for s in view["stages"]],
        "rows": [{"name": lane["name"], "variant_of": lane["parent"], "polar": lane["polar"], "forces_from_a_potential": lane["potential"]} for lane in view["lanes"]],
        "steps": steps, "selected_step": selected, "counts": view["counts"],
        "clusters": [{"name": c["label"], "switched_on": c["enabled"], "jobs": [{"name": j["name"], "state": j["state"]} for j in (c["jobs"] or [])], "problem": c["error"]} for c in clusters],
        "this_computer": None if local is None else [{"name": j["name"], "state": j["state"], "step": j.get("step"), "total": j.get("total"), "metric": j.get("metric")} for j in local["live"]],
        "library": [{"title": p["title"], "text": " ".join(p["text"]), "source": p["source"]} for p in library.PAGES],
    }


def ask(settings, question, ctx, timeout=120):
    question = (question or "").strip()
    if not question:
        raise AssistantError("write a question first")
    exe = find_claude(settings)
    if not exe:
        raise AssistantError("Claude Code was not found on this computer, so the assistant is not available")
    prompt = "Context (JSON):\n" + json.dumps(ctx, ensure_ascii=False) + "\n\nQuestion: " + question[:2000]
    cmd = [exe, "-p", "--output-format", "json", "--tools", "", "--no-session-persistence", "--strict-mcp-config", "--append-system-prompt", SYSTEM]
    try:
        res = subprocess.run(cmd, input=prompt, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    except subprocess.TimeoutExpired:
        raise AssistantError(f"the assistant did not answer in {timeout} s")
    except OSError as err:
        raise AssistantError(f"the assistant could not be started: {err}")
    try:
        data = json.loads(res.stdout or "")
    except ValueError:
        raise AssistantError(((res.stderr or res.stdout or "").strip().splitlines() or ["the assistant gave no answer"])[-1][:300])
    if data.get("is_error") or not data.get("result"):
        raise AssistantError(str(data.get("result") or "the assistant gave no answer")[:300])
    return {"answer": data["result"]}

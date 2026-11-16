"""Results: read what the codes wrote and turn it into numbers with units. Nothing is estimated here.

Thermal conductivity comes from ShengBTE's BTE.KappaTensorVsT_CONV (iterative solution) and _RTA files:
one row per temperature in K with the nine tensor components in W/(m K). The value shown is the mean of
xx, yy and zz. Potentials come from the files the training harness writes for every run: NAME.json (errors
per data set and per structure) and NAME.log (the error after each stretch of training).
"""
import fnmatch
import glob
import math
import os
import re

from .library import SYMBOLS
from .settings import read_json

FIT = {"ls": "least squares", "rfe": "RFE"}
ELEMENT_KEYS = ("element", "elements", "species", "material")


def formula(name):
    """The name itself when it reads as a chemical formula ('C', 'MgO', 'CoSb3'); "" otherwise."""
    name = str(name or "")
    parts = re.findall(r"([A-Z][a-z]?)(\d*)", name)
    if not parts or "".join(a + b for a, b in parts) != name or any(a not in SYMBOLS for a, _ in parts):
        return ""
    return name


def parse_kappa(text):
    """Rows of a KappaTensorVsT file: [{"T": K, "k": mean of xx yy zz, "xx", "yy", "zz"}] in W/(m K)."""
    rows = []
    for line in text.splitlines():
        p = line.split()
        if len(p) < 10:
            continue
        try:
            v = [float(x) for x in p[:10]]
        except ValueError:
            continue
        rows.append({"T": v[0], "xx": v[1], "yy": v[5], "zz": v[9], "k": (v[1] + v[5] + v[9]) / 3.0})
    return rows


def parse_control(text):
    """The settings of a ShengBTE run that matter when two runs are compared."""
    out = {}
    for key in ("ngrid", "scell"):
        m = re.search(key + r"\(:\)\s*=\s*([0-9 ]+)", text)
        if m:
            out[key] = " ".join(m.group(1).split())
    m = re.search(r"scalebroad\s*=\s*([0-9.eE+-]+)", text)
    if m:
        out["scalebroad"] = m.group(1)
    out["nonanalytic"] = bool(re.search(r"nonanalytic\s*=\s*\.true\.", text, re.I))
    out["material"] = control_material(text)
    return out


def control_material(text):
    """The compound of a ShengBTE CONTROL from its elements and types lines: 'C', 'MgO', 'CoSb3'."""
    m = re.search(r"^\s*elements\s*=\s*(.+)$", text, re.M)
    names = re.findall(r"[\"']\s*([A-Za-z]+)\s*[\"']", m.group(1)) if m else []
    if not names:
        return ""
    m = re.search(r"^\s*types\s*=\s*([0-9 ,]+)", text, re.M)
    types = [int(t) for t in re.findall(r"\d+", m.group(1))] if m else []
    counts = [types.count(i + 1) for i in range(len(names))]
    if not all(counts):
        return "".join(names)
    g = math.gcd(*counts)
    return "".join(n + (str(c // g) if c // g > 1 else "") for n, c in zip(names, counts))


def split_name(name):
    """'DFT_rfe' -> ('DFT', 'rfe'); a name without a known ending keeps an empty method."""
    for tag in FIT:
        if name.lower().endswith("_" + tag):
            return name[:-len(tag) - 1], tag
    return name, ""


def _text(path, limit=400000):
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read(limit)
    except OSError:
        return ""


def roots(folders):
    """The folders to search: a name with * stands for every folder that matches it."""
    out = []
    for folder in folders or []:
        for path in (sorted(glob.glob(folder)) if "*" in folder else [folder]):
            if path not in out:
                out.append(path)
    return out


def kappa_runs(folders):
    """Every folder (one level below the given ones) that holds a KappaTensorVsT file."""
    runs = []
    for root in roots(folders):
        for folder in sorted(glob.glob(os.path.join(root, "*", ""))):
            conv = parse_kappa(_text(os.path.join(folder, "BTE.KappaTensorVsT_CONV")))
            rta = parse_kappa(_text(os.path.join(folder, "BTE.KappaTensorVsT_RTA")))
            if not conv and not rta:
                continue
            name = os.path.basename(os.path.normpath(folder))
            source, method = split_name(name)
            runs.append({"id": f"{os.path.basename(os.path.normpath(root))}/{name}", "group": os.path.basename(os.path.normpath(os.path.dirname(os.path.normpath(root)))) or root,
                         "name": name, "source": source, "method": method, "conv": conv, "rta": rta, "folder": os.path.normpath(folder).replace(os.sep, "/"),
                         "control": parse_control(_text(os.path.join(folder, "CONTROL")))})
            runs[-1]["material"] = runs[-1]["control"].pop("material")
            runs[-1]["about"] = describe_kappa(runs[-1])
    return runs


def difference(run, reference, which="conv"):
    """Difference of a run to its reference in % at every temperature both have."""
    ref = {r["T"]: r["k"] for r in reference.get(which) or []}
    return [{"T": r["T"], "pct": 100.0 * (r["k"] - ref[r["T"]]) / ref[r["T"]]} for r in run.get(which) or [] if ref.get(r["T"])]


def comparable(run, reference):
    """Reasons why two ShengBTE runs cannot be compared fairly; empty when the settings match."""
    reasons = []
    for key, label in (("ngrid", "q-mesh"), ("scell", "supercell"), ("scalebroad", "scalebroad")):
        a, b = run["control"].get(key), reference["control"].get(key)
        if a and b and a != b:
            reasons.append(f"{label} differs ({a} against {b})")
    if run["method"] != reference["method"]:
        reasons.append("the fit method differs")
    return reasons


EPOCH = re.compile(r"epoch\s+(\d+) loss \S+ lr \S+ train E (\S+) F (\S+) \| test E (\S+) F (\S+)")
LBFGS = re.compile(r"after L-BFGS \((\d+) it\) train E (\S+) F (\S+) \| test E (\S+) F (\S+)")


def parse_training_log(text):
    """Force error in meV/A on training and held-out structures after each printed step."""
    points = []
    for line in text.splitlines():
        m = EPOCH.match(line)
        if m:
            points.append({"step": int(m[1]), "train": float(m[3]), "test": float(m[5]), "phase": "Adam"})
            continue
        m = LBFGS.match(line)
        if m:
            points.append({"step": (points[-1]["step"] if points else 0) + int(m[1]), "train": float(m[3]), "test": float(m[5]), "phase": "L-BFGS"})
    return points


def _mean(group):
    values = [v["rel_pct"] for v in (group or {}).values() if isinstance(v, dict) and "rel_pct" in v and v is not None]
    return sum(values) / len(values) if values else None


def _sets(data):
    """Names of the data sets a run used: from its table per structure and from its error groups."""
    names = {str(r.get("src")) for r in data.get("rows") or [] if isinstance(r, dict) and r.get("src")}
    for box in ("test", "train", "unseen"):
        names.update(k for k in (data.get(box) or {}) if k != "all")
    return names


def element_of(data, name, rules=None):
    """The element or compound a training run is for; "" when nothing says it.

    Asked in this order: a field of the run file (element, elements, species, material); the rules of the
    local settings, {"C": {"splits": [...], "names": ["pattern*"], "sets": [...]}}; a data set whose name is
    a chemical formula ('C', 'MgO'), when the run has only one such. Potentials of different elements are never compared, so this decides the section.
    """
    for box in (data, data.get("args") or {}, data.get("cfg") or {}):
        for key in ELEMENT_KEYS:
            value = box.get(key) if isinstance(box, dict) else None
            if isinstance(value, (list, tuple)) and value:
                return "".join(str(v) for v in value)
            if isinstance(value, str) and value.strip():
                return value.strip()
    rules = {k: v for k, v in (rules or {}).items() if isinstance(v, dict)}
    split, sets = str((data.get("args") or {}).get("split") or ""), _sets(data)
    for element, rule in rules.items():
        if split and split in (rule.get("splits") or []):
            return element
    for element, rule in rules.items():
        if any(fnmatch.fnmatchcase(name, pattern) for pattern in rule.get("names") or []):
            return element
    for element, rule in rules.items():
        if sets & set(rule.get("sets") or []):
            return element
    named = sorted(s for s in sets if formula(s))
    return named[0] if len(named) == 1 else ""


def stamp(cfg):
    """Changes whenever a result file appears or is rewritten: [number of files, newest change]."""
    files = [p for root in roots(cfg.get("kappa")) for p in glob.glob(os.path.join(root, "*", "BTE.KappaTensorVsT_*"))]
    files += [p for root in cfg.get("runs") or [] for p in glob.glob(os.path.join(root, "*.json"))]
    newest = 0.0
    for path in files:
        try:
            newest = max(newest, os.path.getmtime(path))
        except OSError:
            pass
    return [len(files), round(newest, 3)]


def _num(value):
    return f"{value:g}" if isinstance(value, (int, float)) and not isinstance(value, bool) else str(value)


def _layers(hidden):
    if isinstance(hidden, str):
        hidden = [h for h in hidden.replace(" ", "").split(",") if h]
    elif isinstance(hidden, (int, float)):
        hidden = [hidden]
    hidden = [_num(h) for h in hidden or []]
    if not hidden:
        return ""
    return f"one hidden layer of {hidden[0]} neurons" if len(hidden) == 1 else f"{len(hidden)} hidden layers of {' and '.join(hidden)} neurons"


def _role(row):
    return row.get("role") or ("test" if row.get("test") else "train")


def describe_run(data):
    """What a training run is, in plain sentences taken from its own file: the model, the data, the training."""
    cfg, args, out = data.get("cfg") or {}, data.get("args") or {}, []
    model = []
    if cfg.get("rc_r") is not None:
        model.append(f"Each atom sees its neighbours up to {_num(cfg['rc_r'])} Å for distances"
                     + (f" and {_num(cfg['rc_a'])} Å for angles" if cfg.get("rc_a") is not None else "") + ".")
    if cfg.get("n_r") is not None and cfg.get("n_a") is not None:
        model.append(f"Its surroundings are described with {_num(cfg['n_r'])} radial and {_num(cfg['n_a'])} angular functions"
                     + (f", built from {_num(cfg['k_r'])} and {_num(cfg['k_a'])} basis functions" if cfg.get("k_r") is not None and cfg.get("k_a") is not None else "")
                     + (f", with angular terms up to l = {_num(cfg['lmax'])}" if cfg.get("lmax") is not None else "")
                     + ("; four- and five-body terms are added" if cfg.get("body45") else "") + ".")
    layers = _layers(cfg.get("hidden"))
    if layers:
        model.append(f"A network with {layers}" + (f" ({cfg['act']})" if cfg.get("act") else "") + " turns that description into the energy"
                     + (f"; {data['n_params']} parameters in all" if isinstance(data.get("n_params"), int) else "") + ".")
    if model:
        out.append({"label": "Model", "text": " ".join(model)})
    rows, text = [r for r in data.get("rows") or [] if isinstance(r, dict)], []
    if rows:
        def part(role):
            mine = [r for r in rows if _role(r) == role]
            return len(mine), ", ".join(sorted({str(r.get("src")) for r in mine if r.get("src")}))
        (n, a), (m, b), (k, c) = part("train"), part("test"), part("unseen")
        text.append(f"Trained on {n} structure{'s' if n != 1 else ''}" + (f" ({a})" if a else "") + ".")
        text.append(f"Checked on {m} structure{'s' if m != 1 else ''} it never saw" + (f" ({b})" if b else "") + "." if m
                    else "No structure was held out, so its error is a training error.")
        if k:
            text.append(f"{k} more {'were' if k != 1 else 'was'} left out of both" + (f" ({c})" if c else "") + ".")
    if args.get("split"):
        text.append(f"This choice of structures is the split called {args['split']}.")
    if text:
        out.append({"label": "Data", "text": " ".join(text)})
    text = []
    if args.get("epochs") is not None:
        text.append(f"{_num(args['epochs'])} steps of Adam" + (f", then {_num(args['lbfgs'])} steps of L-BFGS" if args.get("lbfgs") else "") + ".")
    if args.get("init"):
        start = os.path.splitext(os.path.basename(str(args["init"]).replace("\\", "/")))[0]
        text.append(f"It started from the model {start}" + (", with the descriptor scale recomputed for this data" if args.get("rescale") else "") + ".")
    elif "init" in args:
        text.append("It started from random weights.")
    if args.get("seed") is not None:
        text.append(f"Seed {_num(args['seed'])}.")
    if text:
        out.append({"label": "Training", "text": " ".join(text)})
    return out


def brief_run(data):
    """One short line that tells a run from its neighbours in a list."""
    cfg, args, rows, out = data.get("cfg") or {}, data.get("args") or {}, [r for r in data.get("rows") or [] if isinstance(r, dict)], []
    if cfg.get("rc_r") is not None and cfg.get("rc_a") is not None:
        out.append(f"cutoffs {_num(cfg['rc_r'])} and {_num(cfg['rc_a'])} Å")
    layers = _layers(cfg.get("hidden"))
    if layers:
        out.append(layers.replace("one hidden layer of ", "").replace(" hidden layers of ", " layers of "))
    if rows:
        held = sum(1 for r in rows if _role(r) == "test")
        out.append(f"{sum(1 for r in rows if _role(r) == 'train')} trained, {held} held out" if held else f"{sum(1 for r in rows if _role(r) == 'train')} trained, none held out")
    if args.get("init"):
        out.append("continues " + os.path.splitext(os.path.basename(str(args["init"]).replace("\\", "/")))[0])
    return "; ".join(out)


def describe_kappa(run):
    """What a ShengBTE run is, in plain sentences: where its forces came from, the fit and the settings."""
    control, out = run.get("control") or {}, []
    if run["source"].upper() == "DFT":
        out.append({"label": "Forces", "text": "The forces of the displaced supercells come from VASP (DFT). This is the run the others are measured against."})
    else:
        out.append({"label": "Forces", "text": f"The forces come from the potential {run['source']} instead of VASP."})
    out.append({"label": "Fit", "text": {"ls": "The force constants were fitted with least squares, which keeps every parameter.",
                                         "rfe": "The force constants were fitted with RFE, which removes the parameters that do not matter."}
                .get(run["method"], "The folder name does not say which fit was used.")})
    text = []
    if control.get("ngrid"):
        text.append(f"Solved on a {control['ngrid']} q-mesh" + (f", with force constants from a {control['scell']} supercell" if control.get("scell") else "") + ".")
    if control.get("nonanalytic"):
        text.append("The non-analytic correction for polar materials is on.")
    solved = [label for key, label in (("conv", "iterative"), ("rta", "relaxation time")) if run.get(key)]
    if solved:
        text.append(f"It has the {' and the '.join(solved)} solution.")
    if text:
        out.append({"label": "ShengBTE", "text": " ".join(text)})
    return out


def potential_runs(folders, rules=None):
    """One line per finished training run: held-out and training force error in % of the DFT force RMS."""
    runs = []
    for root in folders or []:
        for path in glob.glob(os.path.join(root, "*.json")):
            data = read_json(path)
            if not isinstance(data, dict) or "test" not in data:
                continue
            name = os.path.basename(path)[:-5]
            test = {k: v for k, v in (data.get("test") or {}).items() if isinstance(v, dict)}
            runs.append({"name": name, "element": element_of(data, name, rules), "group": os.path.basename(os.path.dirname(os.path.normpath(root))) or root,
                         "test": _mean(test), "train": _mean(data.get("train")), "sets": {k: v.get("rel_pct") for k, v in test.items()},
                         "seconds": data.get("seconds"), "split": (data.get("args") or {}).get("split"), "cfg": data.get("cfg"),
                         "modified": os.path.getmtime(path), "about": describe_run(data), "brief": brief_run(data)})
    runs.sort(key=lambda r: (r["test"] is None, r["test"] if r["test"] is not None else 0))
    return runs


def potential_run(folders, name):
    """The detail of one run: error per structure and the training curve."""
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", name or ""):
        return None
    for root in folders or []:
        data = read_json(os.path.join(root, name + ".json"))
        if isinstance(data, dict):
            rows = [{"set": r.get("src"), "structure": r.get("job"), "dft_rms": r.get("dft_frms_meV"), "force": r.get("F_meV_A"),
                     "pct": r.get("rel_pct"), "energy": r.get("E_meV_atom"), "role": r.get("role") or ("test" if r.get("test") else "train")}
                    for r in data.get("rows") or [] if isinstance(r, dict)]
            return {"name": name, "rows": rows, "curve": parse_training_log(_text(os.path.join(root, name + ".log"))),
                    "cfg": data.get("cfg"), "args": data.get("args"), "seconds": data.get("seconds")}
    return None

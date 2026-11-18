"""Collected VASP calculations on this computer.

A set is one folder that holds one folder per calculation (job-01, job-02, ...). The local settings name the
sets ("results", "vasp": folders, * for the parts that change). Each calculation is read from its OUTCAR, or
from a small vasprun.xml when there is no OUTCAR: atoms, final energy, forces, pressure, time, and whether it
ended. What was read is remembered in a file next to the settings, so a file is read again only when it changed.
"""
import glob
import math
import os
import re

from .settings import read_json, write_json

XML_LIMIT = 30 * 1024 * 1024
FLOAT = r"(-?\d+\.?\d*(?:[eE][-+]?\d+)?)"


def _formula(elements, counts):
    if not elements or len(elements) != len(counts) or not all(counts):
        return "".join(dict.fromkeys(elements))
    g = 0
    for c in counts:
        g = math.gcd(g, c)
    return "".join(e + (str(c // g) if c // g > 1 else "") for e, c in zip(elements, counts))


def _forces(rows):
    if not rows:
        return None, None
    norms = [math.sqrt(x * x + y * y + z * z) for x, y, z in rows]
    return max(norms), math.sqrt(sum(n * n for n in norms) / (3 * len(rows)))


def _last(pattern, text, cast=float):
    found = re.findall(pattern, text)
    return cast(found[-1]) if found else None


def parse_outcar(text):
    """What an OUTCAR says about one calculation; a value it does not hold is None."""
    elements = re.findall(r"VRHFIN\s*=\s*([A-Za-z]+)\s*:", text)
    m = re.search(r"ions per type\s*=\s*([\d ]+)", text)
    counts = [int(x) for x in m.group(1).split()] if m else []
    nions = _last(r"NIONS\s*=\s*(\d+)", text, int)
    energies = re.findall(r"free  energy   TOTEN\s*=\s*" + FLOAT, text)
    rows = []
    at = text.rfind("TOTAL-FORCE (eV/Angst)")
    if at >= 0 and nions:
        for line in text[at:].split("\n")[2:2 + nions]:
            p = line.split()
            if len(p) == 6:
                try:
                    rows.append((float(p[3]), float(p[4]), float(p[5])))
                except ValueError:
                    break
    fmax, frms = _forces(rows if len(rows) == nions else [])
    energy = float(energies[-1]) if energies else None
    cores = _last(r"running on\s+(\d+)\s+total cores", text, int)
    elapsed = _last(r"Elapsed time \(sec\):\s*" + FLOAT, text)
    return {"material": _formula(elements, counts), "atoms": nions, "energy": energy, "per_atom": energy / nions if energy is not None and nions else None,
            "fmax": fmax, "frms": frms, "pressure": _last(r"external pressure =\s*" + FLOAT + r" kB", text), "volume": _last(r"volume of cell :\s*" + FLOAT, text),
            "encut": _last(r"ENCUT\s*=\s*" + FLOAT, text), "steps": len(energies), "cores": cores, "seconds": elapsed,
            "ended": "General timing and accounting" in text, "from": "OUTCAR"}


def parse_vasprun(text):
    """The same from a vasprun.xml (energy and forces of its last step)."""
    block = re.search(r'<array name="atoms" >.*?</array>', text, re.S)
    names = re.findall(r"<rc><c>\s*([A-Za-z]+)\s*</c>", block.group(0)) if block else []
    elements = list(dict.fromkeys(names))
    energy = _last(r'<i name="e_fr_energy">\s*' + FLOAT, text)
    at = text.rfind('<varray name="forces"')
    rows = [tuple(float(x) for x in v) for v in re.findall(r"<v>\s*" + FLOAT + r"\s+" + FLOAT + r"\s+" + FLOAT + r"\s*</v>", text[at:text.find("</varray>", at)])] if at >= 0 else []
    fmax, frms = _forces(rows)
    n = len(names) or None
    return {"material": _formula(elements, [names.count(e) for e in elements]), "atoms": n, "energy": energy, "per_atom": energy / n if energy is not None and n else None,
            "fmax": fmax, "frms": frms, "pressure": None, "volume": _last(r'<i name="volume">\s*' + FLOAT, text), "encut": _last(r'<i name="ENCUT">\s*' + FLOAT, text),
            "steps": None, "cores": None, "seconds": None, "ended": "</modeling>" in text[-200:], "from": "vasprun.xml"}


def _read(path, limit=None):
    try:
        with open(path, encoding="utf-8", errors="replace") as f:
            return f.read() if limit is None else f.read(limit)
    except OSError:
        return ""


def read_job(folder, cache):
    """One calculation folder, through the cache; None when it holds nothing that can be read."""
    for name, parse in (("OUTCAR", parse_outcar), ("vasprun.xml", parse_vasprun)):
        path = os.path.join(folder, name)
        try:
            st = os.stat(path)
        except OSError:
            continue
        if name == "vasprun.xml" and st.st_size > XML_LIMIT:
            return {"from": "", "skipped": f"its vasprun.xml is {st.st_size // (1024 * 1024)} MB and there is no OUTCAR, so it was not read"}
        key = path.replace("\\", "/")
        hit = cache.get(key)
        if hit and hit.get("mtime") == st.st_mtime and hit.get("size") == st.st_size:
            return hit["data"]
        data = parse(_read(path))
        cache[key] = {"mtime": st.st_mtime, "size": st.st_size, "data": data}
        cache["__changed"] = True
        return data
    return None


def _natural(name):
    return [int(p) if p.isdigit() else p.lower() for p in re.split(r"(\d+)", name)]


def set_name(folder):
    """C:/x/Si_data/Set1_results -> Set1; C:/x/Si_data/Phonons/CALC -> Phonons."""
    parts = os.path.normpath(folder).replace("\\", "/").split("/")
    base = parts[-2] if parts[-1].upper() == "CALC" and len(parts) > 1 else parts[-1]
    return re.sub(r"_results$", "", base)


def folders(patterns):
    out = []
    for pattern in patterns or []:
        for path in (sorted(glob.glob(pattern)) if "*" in pattern else [pattern]):
            if os.path.isdir(path) and path not in out:
                out.append(path)
    return out


def sets(patterns, cache_path=None):
    """Every set with its calculations and a summary; a folder without a readable calculation is left out."""
    cache = read_json(cache_path) if cache_path else None
    cache = cache if isinstance(cache, dict) else {}
    out = []
    for folder in folders(patterns):
        jobs = []
        for sub in sorted((d for d in os.listdir(folder) if os.path.isdir(os.path.join(folder, d))), key=_natural):
            data = read_job(os.path.join(folder, sub), cache)
            if data:
                jobs.append(dict(data, job=sub))
        read = [j for j in jobs if j.get("from")]
        if not read:
            continue
        materials = [j["material"] for j in read if j.get("material")]
        hours = sum(j["seconds"] * j["cores"] / 3600 for j in read if j.get("seconds") and j.get("cores"))
        group = os.path.basename(os.path.dirname(os.path.normpath(folder if os.path.basename(os.path.normpath(folder)).upper() != "CALC" else os.path.dirname(os.path.normpath(folder)))))
        out.append({"id": f"{group}/{set_name(folder)}", "name": set_name(folder), "group": group, "folder": os.path.normpath(folder).replace("\\", "/"),
                    "material": max(set(materials), key=materials.count) if materials else "", "jobs": jobs, "ended": sum(1 for j in read if j.get("ended")),
                    "atoms": sorted({j["atoms"] for j in read if j.get("atoms")}), "core_hours": hours or None,
                    "modified": max((os.path.getmtime(os.path.join(folder, j["job"])) for j in jobs), default=0)})
    if cache_path and cache.pop("__changed", False):
        keep = {f.replace("\\", "/") for f in folders(patterns)}
        cache = {k: v for k, v in cache.items() if any(k.startswith(f + "/") for f in keep)}
        write_json(cache_path, cache)
    return out


def stamp(patterns):
    """Changes when a set gains a calculation or a calculation changes: [calculations, newest change]."""
    count, newest = 0, 0.0
    for folder in folders(patterns):
        try:
            subs = [os.path.join(folder, d) for d in os.listdir(folder)]
        except OSError:
            continue
        for sub in subs:
            if os.path.isdir(sub):
                count += 1
                try:
                    newest = max(newest, os.path.getmtime(sub))
                except OSError:
                    pass
    return [count, round(newest, 3)]


def find(patterns, name):
    """The folder of the set with this name (Set1 or Set1_results), and how many calculations it holds."""
    for folder in folders(patterns):
        if name in (set_name(folder), os.path.basename(os.path.normpath(folder))):
            try:
                subs = [d for d in os.listdir(folder) if os.path.isdir(os.path.join(folder, d))]
            except OSError:
                continue
            group = os.path.basename(os.path.dirname(os.path.normpath(folder if os.path.basename(os.path.normpath(folder)).upper() != "CALC" else os.path.dirname(os.path.normpath(folder)))))
            return {"id": f"{group}/{set_name(folder)}", "folder": folder, "count": len(subs)}
    return None

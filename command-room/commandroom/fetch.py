"""Fetch finished results from a cluster to this computer. On the cluster it only reads.

The local settings give, for a cluster, the pattern of its result folders ("results", with * for the parts
that change) and whether Command Room may fetch by itself ("auto_fetch"). A result folder counts as finished
when it holds a non-empty conductivity file. Its small result files are copied into the folder where a run
of that name already lives on this computer or, for a new one, under the folder the settings give
("results", "fetch_to", with {material} for the compound). What was fetched is remembered in a file next
to the settings, so that a folder is copied again only when its result file changed.
"""
import io
import os
import re
import shlex
import tarfile
import time

from . import remote, results
from .settings import read_json, write_json

MARK = "BTE.KappaTensorVsT_CONV"
FILES = ("CONTROL", "BTE.KappaTensorVsT_CONV", "BTE.KappaTensorVsT_RTA", "BTE.omega", "BTE.v", "BTE.w_anharmonic", "BTE.cvVsT", "BTE.qpoints")
LIMIT = 300 * 1024 * 1024


class FetchError(Exception):
    pass


def pattern_of(cluster):
    """The patterns of the result folders, checked, as one string for the shell; one pattern or a list."""
    given = cluster.get("results") or []
    patterns = [p.strip() for p in ([given] if isinstance(given, str) else given) if isinstance(p, str) and p.strip()]
    if not patterns:
        raise FetchError(f"the result folders of {cluster['label']} are not in the local settings (clusters, results)")
    for pattern in patterns:
        if not re.fullmatch(r"/[A-Za-z0-9_./*+-]+", pattern) or ".." in pattern:
            raise FetchError("a pattern of result folders must be a full path made of letters, digits, . _ - + / and *")
    return " ".join(p.rstrip("/") for p in patterns)


def remote_list(settings, cluster_id):
    """The finished result folders on the cluster: [{"dir", "mtime", "size"}]."""
    cluster = settings.cluster(cluster_id) or {}
    script = (f'for d in {pattern_of(cluster)}; do f="$d/{MARK}"; if [ -s "$f" ]; then '
              'printf "%s\\t%s\\t%s\\n" "$d" "$(stat -c %Y "$f")" "$(stat -c %s "$f")"; fi; done; true')
    code, out = remote.run(settings, cluster_id, script, timeout=90)
    found = []
    for line in out.splitlines():
        parts = line.split("\t")
        if len(parts) == 3 and parts[0].startswith("/") and parts[1].isdigit() and parts[2].isdigit():
            found.append({"dir": parts[0], "mtime": int(parts[1]), "size": int(parts[2])})
    return found


def pull(settings, cluster_id, remote_dir, names=FILES):
    """The result files of one folder as {name: bytes}. Only plain files with the expected names are kept."""
    wanted = [n for n in names if re.fullmatch(r"[A-Za-z0-9_.+-]+", n)]
    script = f"cd {shlex.quote(remote_dir)} && tar -cf - {' '.join(shlex.quote(n) for n in wanted)} 2>/dev/null; true"
    code, data = remote.run(settings, cluster_id, script, timeout=600, binary=True)
    files, total = {}, 0
    try:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:") as tar:
            for member in tar:
                if member.isfile() and member.name in wanted:
                    total += member.size
                    if total > LIMIT:
                        raise FetchError(f"the results of {os.path.basename(remote_dir)} are larger than {LIMIT // 2 ** 20} MB: not copied")
                    files[member.name] = tar.extractfile(member).read()
    except tarfile.TarError:
        raise FetchError(f"the results of {os.path.basename(remote_dir)} could not be read")
    if MARK not in files:
        raise FetchError(f"{os.path.basename(remote_dir)} had no conductivity file when it was read")
    return files


def destination(settings, material, run, known):
    """Where a run lives on this computer: its present folder if it is already here; else next to the other
    runs of its material; else the fetch folder of the settings."""
    for r in known:
        if r["name"] == run and (r.get("material") or "") == material:
            return r["folder"]
    homes = [os.path.dirname(r["folder"]) for r in known if material and (r.get("material") or "") == material]
    if homes:
        return os.path.join(max(set(homes), key=homes.count), run)
    template = settings.data["results"].get("fetch_to") or os.path.join(settings.beside("fetched"), "{material}")
    return os.path.join(template.replace("{material}", material or "unknown"), run)


def _same(path, item):
    """True when the file on this computer has the size of the one on the cluster and is not older."""
    try:
        return os.path.getsize(path) == item["size"] and os.path.getmtime(path) >= item["mtime"] - 1
    except OSError:
        return False


def fetch(settings, cluster_id, log=None):
    """Copy every finished result that is new or changed. Returns {"checked", "new", "updated", "errors"}."""
    cluster = settings.cluster(cluster_id)
    if not cluster:
        raise FetchError("that cluster is not in the local settings")
    index_path = settings.beside("fetched.local.json")
    index = read_json(index_path)
    index = index if isinstance(index, dict) else {}
    seen = index.setdefault(cluster_id, {})
    found = remote_list(settings, cluster_id)
    known = results.kappa_runs(settings.data["results"].get("kappa"))
    out = {"checked": len(found), "new": [], "updated": [], "errors": []}
    names = tuple(cluster.get("fetch_files") or FILES)
    for item in found:
        old = seen.get(item["dir"])
        if old and old.get("mtime") == item["mtime"] and old.get("size") == item["size"] and os.path.isfile(os.path.join(old.get("local", ""), MARK)):
            continue
        run = os.path.basename(item["dir"])
        here = [r for r in known if r["name"] == run and r.get("material") and r["material"] in item["dir"].split("/")]
        if not old and len(here) == 1 and _same(os.path.join(here[0]["folder"], MARK), item):
            seen[item["dir"]] = {"mtime": item["mtime"], "size": item["size"], "local": here[0]["folder"], "at": time.time()}
            out["here"] = out.get("here", 0) + 1
            continue
        try:
            files = pull(settings, cluster_id, item["dir"], names)
            material = results.control_material(files.get("CONTROL", b"").decode("utf-8", errors="replace"))
            target = destination(settings, material, run, known)
            os.makedirs(target, exist_ok=True)
            for name, data in files.items():
                tmp = os.path.join(target, name + ".part")
                with open(tmp, "wb") as f:
                    f.write(data)
                os.replace(tmp, os.path.join(target, name))
        except (FetchError, remote.RemoteError, OSError) as err:
            out["errors"].append(f"{run}: {err}")
            continue
        seen[item["dir"]] = {"mtime": item["mtime"], "size": item["size"], "local": target.replace(os.sep, "/"), "at": time.time()}
        out["updated" if old else "new"].append({"run": run, "material": material, "files": len(files)})
        if log:
            log(f"fetched {material or 'unknown'} {run}")
    write_json(index_path, index)
    return out

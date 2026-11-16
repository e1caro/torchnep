"""Access to the clusters over SSH.

A cluster has one of two modes. In "ssh" mode Command Room logs in itself, with the user's key and only while
the cluster is switched on. In "manual" mode it never logs in: it only writes the commands, the user runs
them and pastes back what they printed, so no password or key ever passes through the program.

Nothing here runs unless the cluster is switched on in the local settings: that switch is the user's
permission. The module offers a few fixed readings (queue, folders, a small file, a dry run of a tool) and
one way to send work, which the server only calls with a plan the user has just confirmed. The login uses
the user's own key in batch mode: no password is ever asked, stored or copied.
"""
import os
import shlex
import shutil
import subprocess

from . import jobs


class RemoteError(Exception):
    pass


def _argv(cluster, settings):
    exe = os.environ.get("COMMANDROOM_SSH") or settings.data.get("ssh") or shutil.which("ssh")
    if not exe:
        raise RemoteError("no ssh program was found on this computer")
    argv = [exe, "-o", "BatchMode=yes", "-o", "ConnectTimeout=15"]
    if cluster.get("known_hosts"):
        argv += ["-o", f"UserKnownHostsFile={cluster['known_hosts']}"]
    if cluster.get("key"):
        argv += ["-i", cluster["key"]]
    return argv + [f"{cluster['user']}@{cluster['host']}", "bash", "-s"]


def run(settings, cluster_id, script, timeout=60):
    """Run a script on the cluster and return (exit code, output). Raises RemoteError when it may not or cannot."""
    cluster = settings.cluster(cluster_id)
    if not cluster:
        raise RemoteError("that cluster is not in the local settings")
    if cluster.get("mode") == "manual":
        raise RemoteError(f"{cluster['label']} is run by you: Command Room only prepares the commands for it and never logs in")
    if not cluster.get("enabled"):
        raise RemoteError(f"{cluster['label']} is switched off: Command Room has not been allowed to connect to it")
    if not (cluster.get("host") and cluster.get("user")):
        raise RemoteError(f"the login of {cluster['label']} is not in the local settings")
    lines = []
    if cluster.get("path_prefix"):
        lines.append(f"export PATH={shlex.quote(cluster['path_prefix'])}:$PATH")
    lines.append(script)
    try:
        res = subprocess.run(_argv(cluster, settings), input=("\n".join(lines) + "\n").encode("utf-8"), capture_output=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        raise RemoteError(f"{cluster['label']} did not answer in {timeout} s")
    except OSError as err:
        raise RemoteError(f"ssh could not be started: {err}")
    stdout = res.stdout.decode("utf-8", errors="replace").replace("\r\n", "\n")
    stderr = res.stderr.decode("utf-8", errors="replace").replace("\r\n", "\n")
    out = stdout + (("\n" + stderr) if stderr and res.returncode else "")
    if res.returncode == 255:
        raise RemoteError(f"could not log in to {cluster['label']}: {stderr.strip().splitlines()[-1] if stderr.strip() else 'no answer'}")
    return res.returncode, out


def queue_command(cluster):
    """The one command that lists the user's jobs; the same whether Command Room or the user runs it."""
    user = shlex.quote(cluster.get("user", ""))
    if cluster.get("scheduler") == "slurm":
        return f"squeue -u {user} -h -o '{jobs.SQUEUE_FORMAT}'"
    return f"qstat -u {user}"


def parse_queue(cluster, text):
    return jobs.parse_squeue(text) if cluster.get("scheduler") == "slurm" else jobs.parse_qstat(text)


def queue(settings, cluster_id):
    cluster = settings.cluster(cluster_id) or {}
    _, out = run(settings, cluster_id, queue_command(cluster))
    return parse_queue(cluster, out)


def sender_commands(cluster, folder, only=""):
    """The command lines of the user's sender script for a folder of calculations: he runs them, not Command Room."""
    sender = cluster.get("sender")
    if not sender:
        raise RemoteError(f"the sender script of {cluster['label']} is not in the local settings")
    folder, only = (folder or "").strip(), (only or "").strip()
    if not folder or any(ch in folder for ch in '"`$;|&<>'):
        raise RemoteError("give the folder with the calculations (no quotes or special characters)")
    if only and not all(ch.isalnum() or ch in "_,.-" for ch in only):
        raise RemoteError("list the materials as names separated by commas")
    base = f'bash "{sender}" {cluster["user"]}@{cluster["host"]} "{folder}"' + (f" --only {only}" if only else "")
    return {"dry": base + " --dry-run", "send": base, "status": base + " --status", "collect": base + " --collect"}


def find_folders(settings, cluster_id, material):
    """Calculation folders of a material: every folder under <data>/<material> that holds a hipipe.cfg or a CALC folder."""
    cluster = settings.cluster(cluster_id) or {}
    if not cluster.get("data"):
        raise RemoteError(f"the data folder of {cluster.get('label', 'the cluster')} is not in the local settings")
    root = shlex.quote(cluster["data"].rstrip("/") + "/" + material)
    _, out = run(settings, cluster_id, f"find {root} -maxdepth 4 \\( -name hipipe.cfg -o -name CALC \\) 2>/dev/null | sed 's#/[^/]*$##' | sort -u | head -60")
    return [line.strip() for line in out.splitlines() if line.strip().startswith("/")]


def read_file(settings, cluster_id, path, max_bytes=200000):
    code, out = run(settings, cluster_id, f"head -c {int(max_bytes)} -- {shlex.quote(path)}")
    if code != 0:
        raise RemoteError(f"could not read {path}")
    return out


def tool_script(cluster, folder, command):
    """The exact script that runs one command of the user's tools in a calculation folder."""
    parts = [f"cd {shlex.quote(folder)} || exit 3"]
    if cluster.get("activate"):
        parts.append(cluster["activate"])
    parts.append(command)
    return "\n".join(parts)


def run_tool(settings, cluster_id, folder, command, timeout=180):
    cluster = settings.cluster(cluster_id) or {}
    return run(settings, cluster_id, tool_script(cluster, folder, command), timeout=timeout)

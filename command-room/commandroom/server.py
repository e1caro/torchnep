"""The local server of Command Room: it serves the interface and answers it with what it reads.

It listens only on this computer. It reads the work board, the job files and (when a cluster is switched on)
the queues. It changes Command Room's own files, the board through the board's own command line, and a cluster
or this computer through a plan the user has just confirmed. The one thing it does by itself is copy finished
results from a cluster whose automatic fetch the user switched on; on the cluster that only reads.
"""
import json
import os
import subprocess
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from . import assistant, board, fetch, jobs, launch, launchers, library, local, pipeline, remote, reports, results
from .settings import Settings

UI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ui")
QUEUE_EVERY_S = 60
FETCH_EVERY_S = 1800


def open_path(path):
    """Open a file or folder of this computer with the program the system uses for it."""
    if os.name == "nt":
        os.startfile(path)
    else:
        subprocess.Popen(["open" if sys.platform == "darwin" else "xdg-open", path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


class App:
    def __init__(self, settings):
        self.settings = settings
        self.lock = threading.RLock()
        self.undo = None
        self.queues = {}
        self.reading = set()
        self.runs = local.Runs(settings.runs_dir)
        self.fetches = {}
        self.fetch_due = set()
        self.opener = open_path
        self.auto_started = {}

    @staticmethod
    def _mtime(path):
        try:
            return os.path.getmtime(path) if path else None
        except OSError:
            return None

    def catalogue(self):
        """The processes and launchers: the user's own file first, then every other command of the guide."""
        own = launchers.load(self.settings.launchers_path)
        mine = {x["id"].lower() for x in own["launchers"]} | {x["label"].lower() for x in own["launchers"]}
        guide = [g for g in launchers.guide(self.settings.data.get("guide"), self.settings.data["clusters"]) if g["label"].lower() not in mine]
        return {"processes": own["processes"], "launchers": own["launchers"], "guide": guide}

    def launcher(self, launcher_id):
        cat = self.catalogue()
        found = next((x for x in cat["launchers"] + cat["guide"] if x["id"] == launcher_id), None)
        if not found:
            raise launch.LaunchError("that launcher does not exist: it may have been renamed in its file")
        return found

    def fetch_now(self, cluster_id, wait=False):
        """Copy the finished results of a cluster in the background; the state says how it went."""
        with self.lock:
            entry = self.fetches.setdefault(cluster_id, {"at": None, "busy": False, "result": None, "error": None})
            if entry["busy"]:
                return
            entry["busy"] = True
            self.fetch_due.discard(cluster_id)

        def work():
            result, error = None, None
            try:
                result = fetch.fetch(self.settings, cluster_id)
            except (fetch.FetchError, remote.RemoteError, OSError) as err:
                error = str(err)
            with self.lock:
                entry.update(at=time.time(), busy=False, result=result, error=error)
        thread = threading.Thread(target=work, daemon=True)
        thread.start()
        if wait:
            thread.join(900)

    def auto_tick(self, now=None):
        """One round of what Command Room does by itself: fetch finished results where the user allowed it."""
        now = now or time.time()
        self.settings.reload_if_changed()
        allowed = [c for c in self.settings.data["clusters"] if c.get("mode") != "manual" and c.get("enabled") and c.get("auto_fetch")]
        for c in allowed:
            entry = self.fetches.get(c["id"])
            if c.get("results") and (not entry or (not entry["busy"] and (c["id"] in self.fetch_due or now - (entry["at"] or 0) > FETCH_EVERY_S))):
                self.fetch_now(c["id"])
        ids = {c["id"] for c in allowed}
        running = {r["label"] for r in self.runs.listing() if r["state"] == "running"}
        for x in launchers.load(self.settings.launchers_path)["launchers"]:
            if x["auto"] and x["contacts"] in ids and x["label"] not in running and now - self.auto_started.get(x["id"], 0) > x["auto"]["every"]:
                self.auto_started[x["id"]] = now
                try:
                    self.runs.start(self.settings, x["label"], x["shell"], launchers.render(x, x["auto"]["values"]), x["cwd"], origin="automatic")
                except (local.LocalError, launchers.LauncherError):
                    pass

    def auto_loop(self):
        while True:
            try:
                self.auto_tick()
            except Exception:
                pass
            time.sleep(20)

    def open(self, a):
        """Open something of this computer the program already knows; a path is never taken from the request."""
        what, key, cfg = a.get("what"), a.get("id") or "", self.settings.data["results"]
        path = None
        if what == "reports":
            path = self.reports_dir
        elif what == "kappa":
            path = next((r["folder"] for r in results.kappa_runs(cfg["kappa"]) if r["id"] == key), None)
        elif what == "potential":
            path = next((os.path.join(root, key + ".json") for root in cfg["runs"] if os.path.isfile(os.path.join(root, key + ".json"))), None) if key.replace("_", "").replace("-", "").replace(".", "").isalnum() else None
            path = os.path.dirname(path) if path else None
        elif what == "log":
            path = self.runs.log_path(key)
        elif what == "launcher":
            found = self.launcher(key)
            path = found["cwd"] or None
        elif what in ("settings", "pipeline", "launchers"):
            path = {"settings": self.settings.path, "pipeline": self.settings.pipeline_path, "launchers": self.settings.launchers_path}[what]
        elif what == "board":
            path = os.path.dirname(self.settings.data["board"]["data"] or "") or None
        elif what == "runs":
            path = self.settings.runs_dir
        if not path or not os.path.exists(path):
            raise pipeline.PipelineError("that file or folder is not on this computer")
        self.opener(path)
        return {"message": "Opened."}

    def store(self):
        return pipeline.load(self.settings.pipeline_path)

    @property
    def reports_dir(self):
        return self.settings.data.get("reports") or os.path.join(os.path.dirname(self.settings.path), "reports")

    def build_report(self, a):
        cfg = self.settings.data["results"]
        try:
            if a.get("kind") == "kappa":
                runs = [r for r in results.kappa_runs(cfg["kappa"]) if (not a.get("runs") or r["id"] in a["runs"]) and (a.get("material") is None or r["material"] == a["material"])]
                path = reports.kappa_report(runs, a.get("reference") or "DFT", self.reports_dir, a.get("which") or "conv")
            elif a.get("kind") == "potential":
                run = results.potential_run(cfg["runs"], a.get("name") or "")
                if not run:
                    raise ValueError("that run was not found")
                summary = next((r for r in results.potential_runs(cfg["runs"], cfg.get("elements")) if r["name"] == run["name"]), None)
                path = reports.potential_report(run, summary, self.reports_dir)
            else:
                raise ValueError("unknown kind of report")
        except ImportError:
            raise pipeline.PipelineError("matplotlib is not installed for the Python that runs Command Room, so the PDF cannot be drawn")
        except ValueError as err:
            raise pipeline.PipelineError(str(err))
        return {"message": "The report is ready.", "name": os.path.basename(path)}

    def board(self):
        return board.read(self.settings.data["board"]["data"])

    def view(self):
        return pipeline.view(self.board(), self.store())

    def refresh_queue(self, cluster_id, wait=False):
        def work():
            entry = {"read": time.time(), "jobs": None, "error": None}
            try:
                entry["jobs"] = remote.queue(self.settings, cluster_id)
            except remote.RemoteError as err:
                entry["error"] = str(err)
            with self.lock:
                before = {j.get("id") for j in (self.queues.get(cluster_id) or {}).get("jobs") or []}
                if entry["jobs"] is not None and before - {j.get("id") for j in entry["jobs"]}:
                    self.fetch_due.add(cluster_id)
                self.queues[cluster_id] = entry
                self.reading.discard(cluster_id)
        with self.lock:
            if cluster_id in self.reading:
                return
            self.reading.add(cluster_id)
        thread = threading.Thread(target=work, daemon=True)
        thread.start()
        if wait:
            thread.join(70)

    def cluster_state(self):
        out = []
        for c in self.settings.data["clusters"]:
            entry = self.queues.get(c["id"])
            manual = c.get("mode") == "manual"
            item = {"id": c["id"], "label": c["label"], "enabled": bool(c["enabled"]) and not manual, "configured": bool(c["host"] and c["user"]),
                    "jobs": None, "error": None, "read": None, "reading": c["id"] in self.reading, "mode": "manual" if manual else "ssh",
                    "command": remote.queue_command(c) if manual else None, "sender": bool(c.get("sender")),
                    "fetch": dict(self.fetches.get(c["id"]) or {"at": None, "busy": False, "result": None, "error": None},
                                  auto=bool(c.get("auto_fetch")), can=bool(c.get("results")) and not manual)}
            if manual:
                if entry:
                    item.update(jobs=entry["jobs"], read=entry["read"])
            elif c["enabled"]:
                if entry:
                    item.update(jobs=entry["jobs"], error=entry["error"], read=entry["read"])
                if not entry or time.time() - entry["read"] > QUEUE_EVERY_S:
                    self.refresh_queue(c["id"])
            out.append(item)
        return out

    def state(self):
        self.settings.reload_if_changed()
        b = self.board()
        v = pipeline.view(b, self.store())
        local = jobs.local(self.settings.data["hub"]["jobs"])
        clusters = self.cluster_state()
        for c in clusters:
            for job in c["jobs"] or []:
                job["row"] = jobs.match_step(job["name"], v["lanes"], v["stages"])
        return {"generated": time.time(), "settings": self.settings.public(), "board": {"available": b is not None, "history": (b or {}).get("history", [])},
                "pipeline": v, "local": local, "clusters": clusters, "undo": self.undo is not None,
                "results_stamp": results.stamp(self.settings.data["results"]), "started": self.runs.listing(12),
                "launchers_stamp": [self._mtime(self.settings.launchers_path), self._mtime(self.settings.data.get("guide"))]}

    def change(self, op, args):
        with self.lock:
            store = self.store()
            before = json.dumps(store)
            if op == "set_state" and not any(s["id"] == args.get("id") for s in store["steps"]):
                step = next((s for s in (self.board() or {}).get("items", []) if s["id"] == args.get("id")), None)
                if not step:
                    raise pipeline.PipelineError("that step does not exist")
                board.set_state(self.settings, step["stage"], step["name"], args.get("state"))
                return f"The board now says {step['name']} ({step['stage']}) is {pipeline.WORD.get(args.get('state'), args.get('state'))}."
            message = pipeline.apply(store, op, args)
            pipeline.save(self.settings.pipeline_path, store)
            self.undo = before
            return message

    def undo_last(self):
        with self.lock:
            if not self.undo:
                raise pipeline.PipelineError("there is nothing to undo")
            pipeline.save(self.settings.pipeline_path, json.loads(self.undo))
            self.undo = None
            return "Undone."

    def launch_options(self, step_id):
        v = self.view()
        step = next((s for s in v["steps"] if s["id"] == step_id), None)
        if not step:
            raise launch.LaunchError("that step does not exist")
        stage = next(s for s in v["stages"] if s["id"] == step["stage"])
        lane = next(l for l in v["lanes"] if l["name"] == step["name"])
        parent = next((l for l in v["lanes"] if l["name"] == lane["parent"]), None)
        return {"step": step, "stage": stage, "actions": launch.actions(stage), "polar": lane["polar"],
                "folder": lane["folder"] or (parent or {}).get("folder", ""),
                "clusters": [{"id": c["id"], "label": c["label"], "enabled": bool(c["enabled"]), "manual": c.get("mode") == "manual"} for c in self.settings.data["clusters"]]}

    def post(self, path, a):
        if path == "/api/pipeline":
            return {"message": self.change(a.get("op"), a.get("args") or {})}
        if path == "/api/undo":
            return {"message": self.undo_last()}
        if path == "/api/cluster":
            cluster = self.settings.cluster(a.get("id"))
            if not cluster:
                raise remote.RemoteError("that cluster is not in the local settings")
            if cluster.get("mode") == "manual" and a.get("enabled"):
                raise remote.RemoteError(f"{cluster['label']} is run by you: Command Room never logs in there")
            cluster["enabled"] = bool(a.get("enabled"))
            self.settings.save()
            self.queues.pop(cluster["id"], None)
            if cluster["enabled"]:
                self.refresh_queue(cluster["id"])
            return {"message": f"{cluster['label']} is switched {'on: Command Room may read it' if cluster['enabled'] else 'off'}."}
        if path == "/api/paste":
            cluster = self.settings.cluster(a.get("id"))
            if not cluster:
                raise remote.RemoteError("that cluster is not in the local settings")
            found = remote.parse_queue(cluster, a.get("text") or "")
            with self.lock:
                self.queues[cluster["id"]] = {"read": time.time(), "jobs": found, "error": None}
            return {"message": f"Read {len(found)} job{'' if len(found) == 1 else 's'} from what you pasted."}
        if path == "/api/sender":
            cluster = self.settings.cluster(a.get("id"))
            if not cluster:
                raise remote.RemoteError("that cluster is not in the local settings")
            return {"commands": remote.sender_commands(cluster, a.get("folder"), a.get("only"))}
        if path == "/api/launch/pasted":
            return {"plan": launch.pasted(a.get("token"), a.get("text"))}
        if path == "/api/launch/sent":
            plan = launch.sent(a.get("token"))
            message = "Marked as sent."
            if plan["mode"] == "submit" and plan["step"]:
                try:
                    message = self.change("set_state", {"id": plan["step"], "state": "sent"})
                except (pipeline.PipelineError, board.BoardError) as err:
                    message = f"The state could not be updated: {err}"
            return {"ok": True, "output": "You ran it yourself.", "board": message}
        if path == "/api/queue":
            self.refresh_queue(a.get("id"), wait=True)
            return {"message": "Queue read."}
        if path == "/api/assistant":
            state = self.state()
            ctx = assistant.context(state["pipeline"], state["clusters"], state["local"], a.get("step"))
            return assistant.ask(self.settings, a.get("question"), ctx)
        if path == "/api/reports/build":
            return self.build_report(a)
        if path == "/api/reports/remove":
            names = a.get("names") if isinstance(a.get("names"), list) else [a.get("name")]
            done = [n for n in names if reports.remove(self.reports_dir, n)]
            return {"removed": done, "message": f"{len(done)} report{'s' if len(done) != 1 else ''} removed." if done else "That report was already gone."}
        if path == "/api/folders":
            return {"folders": remote.find_folders(self.settings, a.get("cluster"), a.get("material") or "")}
        if path == "/api/launch/prepare":
            options = self.launch_options(a.get("step"))
            plan = launch.prepare(self.settings, a.get("cluster"), a.get("folder"), options["stage"], a.get("action"), a.get("fields"),
                                  polar=options["polar"], step_id=a.get("step"))
            if a.get("remember") and a.get("folder"):
                self.change("lane_props", {"name": options["step"]["name"], "folder": a["folder"]})
            return {"plan": plan}
        if path == "/api/launch/local":
            return {"plan": launch.prepare_local(self.settings, self.launcher(a.get("launcher")), a.get("values") or {}, step_id=a.get("step") or None)}
        if path == "/api/launch/dry":
            return {"plan": launch.dry_run(self.settings, a.get("token"))}
        if path == "/api/launch/submit" and (launch._plans.get(a.get("token")) or {}).get("kind") == "local":
            plan = launch.take_local(a.get("token"), a.get("confirm"))
            run = self.runs.start(self.settings, plan["label"], plan["shell"], plan["real"], plan["folder"])
            result = {"ok": True, "output": "Started on this computer. Its output is in Jobs.", "plan": plan, "run": run["id"]}
            if plan["sends"] and plan["step"]:
                try:
                    result["board"] = self.change("set_state", {"id": plan["step"], "state": "sent"})
                except (pipeline.PipelineError, board.BoardError) as err:
                    result["board"] = f"Started, but the state could not be updated: {err}"
            return result
        if path == "/api/runs/stop":
            return self.runs.stop(a.get("id") or "")
        if path == "/api/fetch":
            cluster = self.settings.cluster(a.get("id"))
            if not cluster:
                raise remote.RemoteError("that cluster is not in the local settings")
            fetch.pattern_of(cluster)
            self.fetch_now(cluster["id"])
            return {"message": f"Looking for finished results on {cluster['label']}."}
        if path == "/api/autofetch":
            cluster = self.settings.cluster(a.get("id"))
            if not cluster or cluster.get("mode") == "manual":
                raise remote.RemoteError("results can only be fetched from a cluster Command Room logs in to")
            cluster["auto_fetch"] = bool(a.get("on"))
            self.settings.save()
            return {"message": f"Finished results of {cluster['label']} are {'fetched automatically' if cluster['auto_fetch'] else 'no longer fetched automatically'}."}
        if path == "/api/open":
            return self.open(a)
        if path == "/api/launch/submit":
            result = launch.submit(self.settings, a.get("token"), a.get("confirm"))
            if result["ok"] and result["plan"]["mode"] == "submit" and result["plan"]["step"]:
                try:
                    result["board"] = self.change("set_state", {"id": result["plan"]["step"], "state": "sent"})
                except (pipeline.PipelineError, board.BoardError) as err:
                    result["board"] = f"Sent, but the state could not be updated: {err}"
            return result
        return None


def make_handler(app, port):
    allowed = {f"http://localhost:{port}", f"http://127.0.0.1:{port}"}

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=UI, **k)

        def log_message(self, fmt, *a):
            pass

        def send_json(self, code, data):
            body = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def end_headers(self):
            if not self.path.startswith("/api/"):
                self.send_header("Cache-Control", "no-cache")
            super().end_headers()

        def do_GET(self):
            path, _, query = self.path.partition("?")
            params = dict(p.split("=", 1) for p in query.split("&") if "=" in p)
            try:
                if path == "/api/state":
                    return self.send_json(200, app.state())
                if path == "/api/launch/options":
                    from urllib.parse import unquote
                    return self.send_json(200, app.launch_options(unquote(params.get("step", ""))))
                if path == "/api/results":
                    cfg = app.settings.data["results"]
                    return self.send_json(200, {"kappa": results.kappa_runs(cfg["kappa"]), "potentials": results.potential_runs(cfg["runs"], cfg.get("elements"))})
                if path == "/api/results/run":
                    from urllib.parse import unquote
                    run = results.potential_run(app.settings.data["results"]["runs"], unquote(params.get("name", "")))
                    return self.send_json(200 if run else 404, run or {"error": "that run was not found"})
                if path == "/api/reports":
                    return self.send_json(200, {"reports": reports.listing(app.reports_dir)})
                if path.startswith("/reports/"):
                    from urllib.parse import unquote
                    name = os.path.basename(unquote(path))
                    full = os.path.join(app.reports_dir, name)
                    if not name.lower().endswith(".pdf") or not os.path.isfile(full):
                        return self.send_json(404, {"error": "that report does not exist"})
                    with open(full, "rb") as f:
                        body = f.read()
                    self.send_response(200)
                    self.send_header("Content-Type", "application/pdf")
                    self.send_header("Content-Length", str(len(body)))
                    self.end_headers()
                    self.wfile.write(body)
                    return
                if path == "/api/launchers":
                    cat = app.catalogue()
                    return self.send_json(200, {"processes": cat["processes"], "launchers": [launchers.public(x) for x in cat["launchers"]],
                                                "guide": [launchers.public(x) for x in cat["guide"]], "file": os.path.isfile(app.settings.launchers_path)})
                if path == "/api/runs/log":
                    return self.send_json(200, {"text": app.runs.tail(params.get("id", ""))})
                if path == "/api/library":
                    return self.send_json(200, library.pages())
                if path == "/api/elements":
                    return self.send_json(200, library.elements())
            except (launch.LaunchError, pipeline.PipelineError) as err:
                return self.send_json(400, {"error": str(err)})
            super().do_GET()

        def do_POST(self):
            origin = self.headers.get("Origin")
            if origin and origin not in allowed:
                return self.send_json(403, {"error": "changes are accepted only from this window"})
            try:
                size = int(self.headers.get("Content-Length") or 0)
                args = json.loads(self.rfile.read(size).decode("utf-8") or "{}")
                result = app.post(self.path, args)
            except (pipeline.PipelineError, board.BoardError, remote.RemoteError, launch.LaunchError, assistant.AssistantError, local.LocalError, fetch.FetchError) as err:
                return self.send_json(400, {"error": str(err)})
            except (ValueError, UnicodeDecodeError):
                return self.send_json(400, {"error": "the request could not be read"})
            if result is None:
                return self.send_json(404, {"error": "unknown address"})
            self.send_json(200, result)

    return Handler


def serve(settings_path=None, port=None, announce=print):
    settings = Settings(settings_path)
    port = port or settings.data.get("port") or 8791
    app = App(settings)
    threading.Thread(target=app.auto_loop, daemon=True).start()
    server = ThreadingHTTPServer(("127.0.0.1", port), make_handler(app, port))
    announce(f"Command Room on http://localhost:{port}  (Ctrl+C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0

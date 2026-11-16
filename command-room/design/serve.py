"""serve.py - local server for the Command Room design screens, with live data.

Serves the pages of this folder and two small addresses the pages use:
    GET  /api/state      the work board, the jobs on this computer and the saved pipeline, read again on every call
    POST /api/pipeline   saves the pipeline you edited on the screen (processes, materials, steps, hidden things)
The work board and the job files are only read, never changed. Your edits go to one file (--store).

usage:
    python serve.py --board DATOS.JSON --jobs JOBS_DIR [--store FILE] [--port 8791]

arguments:
    --board   data file of the work board (datos.json of Tablero de trabajo)
    --jobs    folder with one JSON file per job (the jobs folder of ClaudeHub)
    --store   file where the edited pipeline is kept (default: pipeline.local.json next to this script)
    --port    port on 127.0.0.1 (default: 8791)

notes:
    * It listens only on this computer (127.0.0.1) and refuses saves that come from another site.
    * The names of the clusters shown on the pages come from the "clusters" list of the store file
      ([{"id": "torque", "label": "..."}, ...]); without it they are called Torque cluster and Slurm cluster.
    * Without --board or --jobs the page says that the source is missing instead of showing made-up data.
"""
import argparse
import glob
import json
import os
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
BUILTIN = [{"id": "vasp", "label": "VASP"}, {"id": "training", "label": "Training"}, {"id": "shengbte", "label": "ShengBTE"}]


def read_json(path):
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def default_store():
    return {"stages": list(BUILTIN), "parents": {}, "lanes": [], "steps": [], "hidden": {"lanes": [], "steps": []}}


def load_store(path):
    store = read_json(path)
    if not isinstance(store, dict):
        return default_store()
    base = default_store()
    base.update(store)
    return base


def save_store(path, store):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(store, f, ensure_ascii=False, indent=1)
    os.replace(tmp, path)


def state(args):
    board = read_json(args.board) if args.board else None
    jobs = None
    if args.jobs and os.path.isdir(args.jobs):
        jobs = []
        for path in glob.glob(os.path.join(args.jobs, "*.json")):
            job = read_json(path)
            if isinstance(job, dict):
                jobs.append({k: job.get(k) for k in ("name", "project", "total", "step", "metric", "phase", "state", "started", "updated")})
        jobs.sort(key=lambda j: j.get("updated") or 0)
        jobs = jobs[-20:]
    store = load_store(args.store)
    clusters = store.get("clusters") or [{"id": "torque", "label": "Torque cluster"}, {"id": "slurm", "label": "Slurm cluster"}]
    return {
        "generated": time.time(),
        "board": {"items": board.get("items", []), "history": board.get("history", [])[-6:]} if isinstance(board, dict) else None,
        "localJobs": jobs,
        "clusters": [{"id": c.get("id"), "label": c.get("label"), "connected": False} for c in clusters],
        "pipeline": store,
    }


def make_handler(args):
    allowed = {f"http://localhost:{args.port}", f"http://127.0.0.1:{args.port}"}

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=HERE, **k)

        def log_message(self, fmt, *a):
            if "/api/state" not in (a[0] if a else ""):
                super().log_message(fmt, *a)

        def send_json(self, code, data):
            body = json.dumps(data, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path.split("?")[0] == "/api/state":
                self.send_json(200, state(args))
            else:
                super().do_GET()

        def do_POST(self):
            if self.path != "/api/pipeline":
                return self.send_json(404, {"error": "unknown address"})
            origin = self.headers.get("Origin")
            if origin and origin not in allowed:
                return self.send_json(403, {"error": "saves are accepted only from this page"})
            try:
                size = int(self.headers.get("Content-Length") or 0)
                store = json.loads(self.rfile.read(size).decode("utf-8"))
                if not isinstance(store, dict) or not isinstance(store.get("stages"), list):
                    raise ValueError("the pipeline needs a list of stages")
            except (ValueError, UnicodeDecodeError) as err:
                return self.send_json(400, {"error": str(err)})
            save_store(args.store, store)
            self.send_json(200, {"saved": True})

    return Handler


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--board")
    ap.add_argument("--jobs")
    ap.add_argument("--store", default=os.path.join(HERE, "pipeline.local.json"))
    ap.add_argument("--port", type=int, default=8791)
    args = ap.parse_args(argv)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), make_handler(args))
    print(f"Command Room design screens on http://localhost:{args.port}  (Ctrl+C to stop)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()

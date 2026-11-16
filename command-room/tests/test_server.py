"""Tests of the local server: the state it gives, the changes it accepts and the ones it refuses.

run:  python -m unittest discover -s tests   (from the command-room folder)
"""
import json
import os
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from commandroom import launch, pipeline, remote  # noqa: E402
from commandroom.server import App, make_handler  # noqa: E402
from commandroom.settings import Settings  # noqa: E402

BOARD = {"version": 1, "history": [{"t": "2026-01-01T00:00:00+01:00", "by": "test", "text": "Aa (vasp): enviado -> terminado"}], "items": [
    {"id": "vasp__Aa", "stage": "vasp", "name": "Aa", "status": "terminado", "updated": "2026-01-01T00:00:00+01:00", "note": ""},
    {"id": "training__Aa", "stage": "training", "name": "Aa", "status": "faltan", "updated": "2026-01-01T00:00:00+01:00", "note": ""}]}


class ServerCase(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        d = self.tmp.name
        with open(os.path.join(d, "datos.json"), "w", encoding="utf-8") as f:
            json.dump(BOARD, f)
        tool = os.path.join(d, "tool.py")
        with open(tool, "w", encoding="utf-8") as f:
            f.write("import sys, json\nwith open(sys.argv[0] + '.log', 'a') as f:\n    f.write(json.dumps(sys.argv[1:]) + '\\n')\n")
        os.makedirs(os.path.join(d, "jobs"))
        with open(os.path.join(d, "settings.local.json"), "w", encoding="utf-8") as f:
            json.dump({"python": sys.executable, "board": {"data": os.path.join(d, "datos.json"), "tool": tool}, "hub": {"jobs": os.path.join(d, "jobs")},
                       "clusters": [{"id": "torque", "label": "North", "scheduler": "torque", "host": "h", "user": "u", "tools": "/data/tools", "data": "/data"}]}, f)
        self.app = App(Settings(os.path.join(d, "settings.local.json")))
        self.tool_log = tool + ".log"

    def tearDown(self):
        launch._plans.clear()
        self.tmp.cleanup()

    def test_state_has_everything_the_interface_draws(self):
        s = self.app.state()
        self.assertTrue(s["board"]["available"])
        self.assertEqual(s["pipeline"]["counts"]["ready"], 1)
        self.assertEqual(s["local"], {"live": [], "history": []})
        self.assertEqual(s["results_stamp"], [0, 0.0])
        self.assertEqual([(c["label"], c["enabled"], c["jobs"]) for c in s["clusters"]], [("North", False, None)])
        self.assertNotIn("host", json.dumps(s["settings"]))

    def test_reports_can_be_removed_and_nothing_else(self):
        folder = self.app.reports_dir
        os.makedirs(folder)
        for name in ("a.pdf", "b.pdf", "notes.txt"):
            with open(os.path.join(folder, name), "w") as f:
                f.write("x")
        self.assertEqual(self.app.post("/api/reports/remove", {"name": "a.pdf"})["removed"], ["a.pdf"])
        self.assertEqual(sorted(os.listdir(folder)), ["b.pdf", "notes.txt"])
        for name in ("notes.txt", "../settings.local.json", "../datos.json", "missing.pdf", None):
            self.assertEqual(self.app.post("/api/reports/remove", {"name": name})["removed"], [])
        self.assertTrue(os.path.isfile(os.path.join(self.tmp.name, "settings.local.json")))
        self.assertEqual(self.app.post("/api/reports/remove", {"names": ["b.pdf", "notes.txt"]})["removed"], ["b.pdf"])
        self.assertEqual(os.listdir(folder), ["notes.txt"])

    def test_edit_and_undo(self):
        self.app.post("/api/pipeline", {"op": "add_stage", "args": {"label": "Relaxation", "after": "__start"}})
        self.assertEqual(self.app.state()["pipeline"]["stages"][0]["label"], "Relaxation")
        self.assertTrue(self.app.state()["undo"])
        self.app.post("/api/undo", {})
        self.assertEqual(len(self.app.state()["pipeline"]["stages"]), 3)
        with self.assertRaises(pipeline.PipelineError):
            self.app.post("/api/undo", {})

    def test_board_step_changes_go_to_the_board_tool(self):
        self.app.post("/api/pipeline", {"op": "set_state", "args": {"id": "training__Aa", "state": "sent"}})
        with open(self.tool_log) as f:
            self.assertEqual(json.loads(f.readline()), ["set", "training", "Aa", "enviado", "--by", "command-room"])
        with self.assertRaises(pipeline.PipelineError):
            self.app.post("/api/pipeline", {"op": "set_state", "args": {"id": "nothing", "state": "sent"}})

    def test_cluster_switch_is_saved_and_off_means_no_contact(self):
        with self.assertRaises(remote.RemoteError):
            self.app.post("/api/folders", {"cluster": "torque", "material": "Aa"})
        os.environ["COMMANDROOM_SSH"] = os.path.join(self.tmp.name, "no-such-ssh")
        try:
            self.app.post("/api/cluster", {"id": "torque", "enabled": True})
            self.assertTrue(Settings(self.app.settings.path).cluster("torque")["enabled"])
            self.app.post("/api/cluster", {"id": "torque", "enabled": False})
            self.assertFalse(Settings(self.app.settings.path).cluster("torque")["enabled"])
        finally:
            os.environ.pop("COMMANDROOM_SSH", None)

    def test_launch_plan_through_the_server(self):
        options = self.app.launch_options("training__Aa")
        self.assertEqual([a["id"] for a in options["actions"]], ["check", "shells", "fit"])
        plan = self.app.post("/api/launch/prepare", {"step": "training__Aa", "action": "fit", "cluster": "torque", "folder": "/data/Aa", "fields": {}, "remember": True})["plan"]
        self.assertEqual(plan["real"], "python /data/tools/hipipe.py fit --submit")
        self.assertEqual(self.app.launch_options("training__Aa")["folder"], "/data/Aa")
        with self.assertRaises(remote.RemoteError):
            self.app.post("/api/launch/dry", {"token": plan["token"]})
        with self.assertRaises(launch.LaunchError):
            self.app.post("/api/launch/submit", {"token": plan["token"], "confirm": plan["token"]})

    def test_assistant_uses_only_what_it_is_given(self):
        from commandroom import assistant
        fake = os.path.join(self.tmp.name, "fake_claude.py")
        with open(fake, "w", encoding="utf-8") as f:
            f.write("import sys, json\nwith open(sys.argv[0] + '.in', 'w', encoding='utf-8') as f:\n    f.write(json.dumps(sys.argv[1:]) + '\\n' + sys.stdin.read())\n"
                    "print(json.dumps({'result': 'Training of Aa is ready (pipeline).', 'is_error': False}))\n")
        launcher = os.path.join(self.tmp.name, "fake_claude.cmd" if os.name == "nt" else "fake_claude.sh")
        with open(launcher, "w") as f:
            f.write(f'@"{sys.executable}" "{fake}" %*\n' if os.name == "nt" else f'#!/bin/sh\nexec "{sys.executable}" "{fake}" "$@"\n')
        if os.name != "nt":
            os.chmod(launcher, 0o755)
        os.environ["COMMANDROOM_CLAUDE"] = launcher
        try:
            answer = self.app.post("/api/assistant", {"question": "What can I launch?", "step": "training__Aa"})
            self.assertIn("ready", answer["answer"])
            with open(fake + ".in", encoding="utf-8") as f:
                sent = f.read()
            self.assertIn("--tools", sent)
            self.assertIn("What can I launch?", sent)
            self.assertIn('"selected_step"', sent)
            self.assertNotIn("settings.local.json", sent)
            self.assertNotIn('"host"', sent)
            with self.assertRaises(assistant.AssistantError):
                self.app.post("/api/assistant", {"question": "  "})
        finally:
            os.environ.pop("COMMANDROOM_CLAUDE", None)

    def test_http_refuses_other_sites(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(self.app, 8791))
        port = server.server_address[1]
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/state", timeout=5) as r:
                self.assertIn("pipeline", json.load(r))
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=5) as r:
                self.assertIn(b"Command Room", r.read())
            req = urllib.request.Request(f"http://127.0.0.1:{port}/api/pipeline", data=b'{"op": "show_steps", "args": {}}',
                                         headers={"Content-Type": "application/json", "Origin": "http://evil.example"})
            with self.assertRaises(urllib.error.HTTPError) as ctx:
                urllib.request.urlopen(req, timeout=5)
            self.assertEqual(ctx.exception.code, 403)
            ok = urllib.request.Request(f"http://127.0.0.1:{port}/api/pipeline", data=b'{"op": "show_steps", "args": {}}',
                                        headers={"Content-Type": "application/json", "Origin": "http://localhost:8791"})
            with urllib.request.urlopen(ok, timeout=5) as r:
                self.assertIn("message", json.load(r))
        finally:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()

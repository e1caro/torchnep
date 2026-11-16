"""Tests of the launchers, of running a command on this computer, of the automatic fetch and of Open.

run:  python -m unittest discover -s tests   (from the command-room folder)
"""
import io
import json
import os
import shutil
import sys
import tarfile
import tempfile
import time
import unittest
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from commandroom import fetch, launch, launchers, local, remote  # noqa: E402
from commandroom.server import App  # noqa: E402
from commandroom.settings import Settings  # noqa: E402

BASH = local._git_bash() or shutil.which("bash")
SEND = {"id": "send-tree", "process": "send", "label": "Job tree", "what": "Sends a tree.", "shell": "bash", "contacts": "north", "sends": True,
        "command": "bash send.sh submit {folder}{only}{watch}", "dry": "bash send.sh submit {folder}{only} --dry-run",
        "fields": [{"name": "folder", "label": "Folder", "required": True}, {"name": "only", "label": "Only", "format": " --only {value}"},
                   {"name": "watch", "label": "Watch", "switch": " --watch"}]}
ECHO = {"id": "say", "process": "report", "label": "Say", "shell": "bash", "command": "echo {kind} {line}",
        "fields": [{"name": "kind", "label": "Kind", "choices": ["a", "b"], "default": "a"}, {"name": "line", "label": "Words", "raw": True}]}
GUIDE = {"sections": [{"title": "Cluster work", "items": [
    {"name": "fit.py", "what": "Fits.", "where": "~/tools", "usage": "python fit.py --go\nsecond line", "runs_on": "North cluster", "kind": "script"},
    {"name": "plot.py", "what": "Plots.", "where": "~/plots, elsewhere", "usage": "python plot.py FILE", "runs_on": "PC or North cluster", "kind": "script",
     "children": [{"name": "train.py", "what": "Trains.", "usage": "python train.py", "runs_on": "WSL2 (GPU)", "kind": "script"}]},
    {"name": "say", "what": "Already a launcher of mine.", "usage": "say", "runs_on": "PC"}, {"name": "no usage", "what": "Skipped."}]}]}


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        d = self.tmp.name
        self.write("launchers.local.json", {"processes": [{"id": "mine", "label": "Mine"}], "launchers": [SEND, ECHO, {"id": "broken"}, dict(ECHO), {"id": "odd", "process": "nowhere", "command": "true"}]})
        self.write("guide.json", GUIDE)
        self.write("settings.local.json", {"guide": os.path.join(d, "guide.json"), "results": {"kappa": [os.path.join(d, "known")], "fetch_to": os.path.join(d, "{material}_data")},
                                           "clusters": [{"id": "north", "label": "North", "host": "h", "user": "u", "enabled": True, "results": "/data/*/bte/*"},
                                                        {"id": "south", "label": "South", "mode": "manual", "host": "h", "user": "u"}]})
        self.settings = Settings(os.path.join(d, "settings.local.json"))
        self.app = App(self.settings)

    def tearDown(self):
        launch._plans.clear()
        for _ in range(50):
            if not self.app.runs.live:
                break
            time.sleep(0.1)
        self.tmp.cleanup()

    def write(self, name, data):
        with open(os.path.join(self.tmp.name, name), "w", encoding="utf-8") as f:
            json.dump(data, f)

    def by(self, launcher_id):
        return self.app.launcher(launcher_id)


class Catalogue(Base):
    def test_the_private_file(self):
        cat = launchers.load(self.settings.launchers_path)
        self.assertEqual([p["id"] for p in cat["processes"]][-2:], ["mine", "other"])
        self.assertEqual([(x["id"], x["process"]) for x in cat["launchers"]], [("send-tree", "send"), ("say", "report"), ("odd", "other")])
        self.assertEqual(launchers.load(os.path.join(self.tmp.name, "missing.json"))["launchers"], [])

    def test_the_guide_adds_every_other_command(self):
        cat = self.app.catalogue()
        guide = {g["label"]: g for g in cat["guide"]}
        self.assertEqual(sorted(guide), ["fit.py", "plot.py", "train.py"])
        self.assertEqual((guide["fit.py"]["copy"], guide["fit.py"]["contacts"], guide["fit.py"]["fields"][0]["default"]), (True, "north", "python fit.py --go"))
        self.assertEqual((guide["plot.py"]["copy"], guide["plot.py"]["shell"]), (False, "bash"))
        self.assertTrue(guide["plot.py"]["cwd"].endswith("/plots"))
        self.assertEqual(guide["train.py"]["shell"], "wsl")

    def test_the_command_line(self):
        self.assertEqual(launchers.render(SEND_READY, {"folder": "C:/my jobs", "only": "1-5", "watch": "1"}), "bash send.sh submit 'C:/my jobs' --only 1-5 --watch")
        self.assertEqual(launchers.render(SEND_READY, {"folder": "x"}, dry=True), "bash send.sh submit x --dry-run")
        self.assertEqual(launchers.render(SEND_READY, {"folder": "x; rm -rf y"}), "bash send.sh submit 'x; rm -rf y'")
        self.assertEqual(launchers.render(ECHO_READY, {"line": "--one --two"}), "echo a --one --two")
        for values, word in (({}, "needed"), ({"folder": "a\nb"}, "one line")):
            with self.assertRaisesRegex(launchers.LauncherError, word):
                launchers.render(SEND_READY, values)
        with self.assertRaisesRegex(launchers.LauncherError, "one of"):
            launchers.render(ECHO_READY, {"kind": "z"})
        with self.assertRaisesRegex(launchers.LauncherError, "no dry run"):
            launchers.render(ECHO_READY, {}, dry=True)
        with self.assertRaisesRegex(launchers.LauncherError, "does not have"):
            launchers.render(launchers._launcher({"id": "x", "command": "run {missing}"}, set()), {})
        self.assertEqual(launchers.quote("it's", "powershell"), "'it''s'")

    def test_what_the_interface_gets(self):
        public = launchers.public(self.by("send-tree"))
        self.assertEqual((public["sends"], public["auto"], public["contacts"]), (True, False, "north"))


SEND_READY = launchers._launcher(SEND, {"send"})
ECHO_READY = launchers._launcher(ECHO, {"report"})


class Plans(Base):
    def test_a_launcher_that_connects_needs_its_cluster_switched_on(self):
        plan = launch.prepare_local(self.settings, self.by("send-tree"), {"folder": "x"})
        self.assertEqual((plan["kind"], plan["manual"], plan["sends"], plan["mode"]), ("local", False, True, "submit"))
        self.assertIn("connects to North", plan["notes"][0])
        self.settings.cluster("north")["enabled"] = False
        with self.assertRaisesRegex(launch.LaunchError, "switched off"):
            launch.prepare_local(self.settings, self.by("send-tree"), {"folder": "x"})

    def test_a_cluster_run_by_hand_only_gets_the_command(self):
        mine = dict(self.by("send-tree"), contacts="south", cwd="C:/work")
        plan = launch.prepare_local(self.settings, mine, {"folder": "x"})
        self.assertTrue(plan["manual"])
        self.assertEqual(plan["copy_dry"], "cd 'C:/work' && bash send.sh submit x --dry-run")
        with self.assertRaisesRegex(launch.LaunchError, "run by you"):
            launch.take_local(plan["token"], plan["token"])
        with self.assertRaisesRegex(launch.LaunchError, "dry run first"):
            launch.sent(plan["token"])
        launch.pasted(plan["token"], "would send 3 jobs")
        self.assertEqual(launch.sent(plan["token"])["launcher"], "send-tree")

    def test_sending_needs_the_dry_run_and_the_confirmation(self):
        plan = launch.prepare_local(self.settings, self.by("send-tree"), {"folder": "x"})
        with self.assertRaisesRegex(launch.LaunchError, "not confirmed"):
            launch.take_local(plan["token"], "something else")
        with self.assertRaisesRegex(launch.LaunchError, "dry run first"):
            launch.take_local(plan["token"], plan["token"])
        plan["dry_ok"] = True
        self.assertEqual(launch.take_local(plan["token"], plan["token"])["real"], "bash send.sh submit x")
        with self.assertRaises(launch.LaunchError):
            launch.take_local(plan["token"], plan["token"])

    def test_a_folder_that_is_not_there(self):
        with self.assertRaisesRegex(launch.LaunchError, "does not exist"):
            launch.prepare_local(self.settings, dict(self.by("say"), cwd=os.path.join(self.tmp.name, "nowhere")), {})


@unittest.skipUnless(BASH, "needs bash")
class OnThisComputer(Base):
    def test_wsl_paths(self):
        self.assertEqual(local.wsl_path("C:\\Users\\me\\x y"), "/mnt/c/Users/me/x y")
        self.assertEqual(local.wsl_path("/already/unix"), "/already/unix")

    def test_a_short_command(self):
        code, out = local.run_wait(self.settings, "bash", "echo one; echo two 1>&2; exit 3", self.tmp.name)
        self.assertEqual((code, out.split()), (3, ["one", "two"]))
        with self.assertRaisesRegex(local.LocalError, "did not finish"):
            local.run_wait(self.settings, "bash", "sleep 20", self.tmp.name, timeout=1)
        with self.assertRaisesRegex(local.LocalError, "does not exist"):
            local.run_wait(self.settings, "bash", "true", os.path.join(self.tmp.name, "nowhere"))

    def test_the_whole_way_through_the_server(self):
        plan = self.app.post("/api/launch/local", {"launcher": "say", "values": {"kind": "b", "line": "hello there"}})["plan"]
        self.assertEqual(plan["real"], "echo b hello there")
        result = self.app.post("/api/launch/submit", {"token": plan["token"], "confirm": plan["token"]})
        self.assertTrue(result["ok"])
        for _ in range(100):
            runs = self.app.state()["started"]
            if runs and runs[0]["state"] != "running":
                break
            time.sleep(0.1)
        self.assertEqual((runs[0]["label"], runs[0]["state"], runs[0]["code"], runs[0]["last"]), ("Say", "done", 0, "b hello there"))
        self.assertNotIn("pid", runs[0])
        self.assertEqual(self.app.runs.tail(result["run"]).strip(), "b hello there")
        self.assertEqual(self.app.runs.tail("../settings.local"), "")

    def test_stop_ends_the_command(self):
        run = self.app.runs.start(self.settings, "long", "bash", "echo started; sleep 60", self.tmp.name)
        time.sleep(1.0)
        self.app.post("/api/runs/stop", {"id": run["id"]})
        for _ in range(150):
            state = self.app.runs.listing()[0]["state"]
            if state != "running":
                break
            time.sleep(0.1)
        self.assertEqual(state, "stopped")
        with self.assertRaisesRegex(local.LocalError, "not running"):
            self.app.runs.stop(run["id"])

    def test_a_dry_run_on_this_computer(self):
        mine = dict(self.by("say"), dry="echo would say {kind}")
        plan = launch.prepare_local(self.settings, mine, {})
        self.assertEqual(launch.dry_run(self.settings, plan["token"])["dry_output"], "would say a")
        self.assertTrue(plan["dry_ok"])


def tar_of(files):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w") as tar:
        for name, data in files.items():
            info = tarfile.TarInfo(name)
            info.size = len(data)
            tar.addfile(info, io.BytesIO(data))
    return buffer.getvalue()


CONTROL = b" elements='Mg','O'\n types=1 2\n ngrid(:)=8 8 8\n"
KAPPA = b"  300.0  1.0 0 0 0 1.0 0 0 0 1.0  5\n"


class Fetch(Base):
    def cluster_answers(self, listing, files):
        def run(settings, cluster_id, script, timeout=60, binary=False):
            self.scripts.append(script)
            if binary:
                wanted = next(d for d in files if d in script)
                return 0, tar_of(files[wanted])
            return 0, listing
        self.scripts = []
        return mock.patch.object(remote, "run", side_effect=run)

    def test_new_results_are_copied_once(self):
        listing = "/data/MgO/bte/DFT_rfe\t100\t38\n/data/MgO/bte/POT_rfe\t100\t38\nnoise\n"
        files = {"/data/MgO/bte/DFT_rfe": {"CONTROL": CONTROL, fetch.MARK: KAPPA, "BTE.omega": b"1 2\n", "../evil": b"x"}, "/data/MgO/bte/POT_rfe": {"CONTROL": CONTROL, fetch.MARK: KAPPA}}
        with self.cluster_answers(listing, files):
            out = fetch.fetch(self.settings, "north")
            self.assertEqual((out["checked"], [n["run"] for n in out["new"]], out["errors"]), (2, ["DFT_rfe", "POT_rfe"], []))
            self.assertEqual(out["new"][0]["material"], "MgO")
            target = os.path.join(self.tmp.name, "MgO_data", "DFT_rfe")
            self.assertEqual(sorted(os.listdir(target)), ["BTE.KappaTensorVsT_CONV", "BTE.omega", "CONTROL"])
            self.assertFalse(os.path.exists(os.path.join(self.tmp.name, "evil")))
            again = fetch.fetch(self.settings, "north")
            self.assertEqual((again["new"], again["updated"]), ([], []))
        with self.cluster_answers(listing.replace("DFT_rfe\t100", "DFT_rfe\t200"), files):
            self.assertEqual([n["run"] for n in fetch.fetch(self.settings, "north")["updated"]], ["DFT_rfe"])
        self.assertTrue(all("rm " not in s and ">" not in s.replace("2>/dev/null", "") for s in self.scripts))

    def test_a_run_already_on_this_computer_is_not_copied_again(self):
        here = os.path.join(self.tmp.name, "known", "DFT_rfe")
        os.makedirs(here)
        for name, data in (("CONTROL", CONTROL), (fetch.MARK, KAPPA)):
            with open(os.path.join(here, name), "wb") as f:
                f.write(data)
        listing = f"/data/MgO/bte/DFT_rfe\t100\t{len(KAPPA)}\n/data/MgO/bte/NEW_rfe\t100\t{len(KAPPA)}\n"
        with self.cluster_answers(listing, {"/data/MgO/bte/NEW_rfe": {"CONTROL": CONTROL, fetch.MARK: KAPPA}}):
            out = fetch.fetch(self.settings, "north")
        self.assertEqual((out.get("here"), [n["run"] for n in out["new"]]), (1, ["NEW_rfe"]))
        self.assertTrue(os.path.isfile(os.path.join(self.tmp.name, "known", "NEW_rfe", fetch.MARK)))

    def test_what_is_refused(self):
        for bad in ("", "relative/*", "/data/$(x)/*", "/data/../etc/*", "/data/a b/*"):
            self.settings.cluster("north")["results"] = bad
            with self.assertRaises(fetch.FetchError):
                fetch.pattern_of(self.settings.cluster("north"))
        self.settings.cluster("north")["results"] = ["/a/*/b", "/c/*"]
        self.assertEqual(fetch.pattern_of(self.settings.cluster("north")), "/a/*/b /c/*")
        self.settings.cluster("south")["results"] = "/c/*"
        with self.assertRaisesRegex(remote.RemoteError, "run by you"):
            fetch.remote_list(self.settings, "south")

    def test_the_program_fetches_by_itself_only_where_allowed(self):
        with mock.patch.object(self.app, "fetch_now") as fetch_now:
            self.app.auto_tick()
            fetch_now.assert_not_called()
            self.app.post("/api/autofetch", {"id": "north", "on": True})
            self.app.auto_tick()
            fetch_now.assert_called_once_with("north")
        with self.assertRaises(remote.RemoteError):
            self.app.post("/api/autofetch", {"id": "south", "on": True})
        state = {c["id"]: c["fetch"] for c in self.app.state()["clusters"]}
        self.assertEqual((state["north"]["auto"], state["north"]["can"], state["south"]["can"]), (True, True, False))

    def test_a_job_that_leaves_the_queue_asks_for_a_fetch(self):
        self.app.queues["north"] = {"read": 0, "jobs": [{"id": "1"}, {"id": "2"}], "error": None}
        with mock.patch.object(remote, "queue", return_value=[{"id": "2"}]):
            self.app.refresh_queue("north", wait=True)
        self.assertEqual(self.app.fetch_due, {"north"})


class OutsideEdits(Base):
    def test_settings_edited_outside_are_read_again(self):
        self.assertFalse(self.settings.reload_if_changed())
        with open(self.settings.path, encoding="utf-8") as f:
            data = json.load(f)
        data["clusters"][0]["label"] = "Renamed"
        self.write("settings.local.json", data)
        os.utime(self.settings.path, (time.time() + 5, time.time() + 5))
        self.assertEqual(self.app.state()["clusters"][0]["label"], "Renamed")

    def test_a_new_launcher_changes_the_stamp(self):
        before = self.app.state()["launchers_stamp"]
        self.write("launchers.local.json", {"launchers": [ECHO]})
        os.utime(self.settings.launchers_path, (time.time() + 5, time.time() + 5))
        self.assertNotEqual(self.app.state()["launchers_stamp"], before)
        self.assertEqual([x["id"] for x in self.app.catalogue()["launchers"]], ["say"])

    def test_open_only_what_the_program_knows(self):
        opened = []
        self.app.opener = opened.append
        os.makedirs(self.app.reports_dir)
        self.app.post("/api/open", {"what": "reports"})
        self.app.post("/api/open", {"what": "launchers"})
        self.assertEqual(opened, [self.app.reports_dir, self.settings.launchers_path])
        for request in ({"what": "file", "id": self.settings.path}, {"what": "potential", "id": "../settings.local"}, {"what": "log", "id": "../settings.local"}, {"what": "kappa", "id": "x"}):
            with self.assertRaises(Exception):
                self.app.post("/api/open", request)
        self.assertEqual(len(opened), 2)


if __name__ == "__main__":
    unittest.main()

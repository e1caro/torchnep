"""Tests of the core: pipeline rules, board reading, job sources, launch plans and the cluster switch.

run:  python -m unittest discover -s tests   (from the command-room folder)
"""
import json
import os
import stat
import sys
import tempfile
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from commandroom import board, jobs, launch, pipeline, remote  # noqa: E402
from commandroom.settings import Settings  # noqa: E402


def item(stage, name, status):
    return {"id": f"{stage}__{name}", "stage": stage, "name": name, "status": status, "updated": "2026-01-01T00:00:00+01:00", "note": ""}


BOARD = {"version": 1, "history": [], "items": [
    item("vasp", "Aa", "terminado"), item("training", "Aa", "faltan"), item("shengbte", "Aa", "faltan"),
    item("vasp", "Bb", "terminado"), item("training", "Bb", "terminado"), item("shengbte", "Bb rfe", "faltan"), item("shengbte", "Bb ls", "terminado"),
    item("training", "AaTorch", "terminado"), item("shengbte", "AaTorch", "faltan"),
    item("vasp", "Cc", "enviado"), item("training", "Cc", "faltan"),
]}


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = self.tmp.name
        self.board_path = os.path.join(self.dir, "datos.json")
        with open(self.board_path, "w", encoding="utf-8") as f:
            json.dump(BOARD, f)
        self.settings_path = os.path.join(self.dir, "settings.local.json")
        with open(self.settings_path, "w", encoding="utf-8") as f:
            json.dump({"board": {"data": self.board_path}, "clusters": [
                {"id": "torque", "label": "North", "scheduler": "torque", "host": "h", "user": "u", "tools": "/data/tools", "data": "/data"},
                {"id": "slurm", "label": "South", "scheduler": "slurm", "host": "h2", "user": "u2"}]}, f)
        self.settings = Settings(self.settings_path)

    def tearDown(self):
        os.environ.pop("COMMANDROOM_SSH", None)
        launch._plans.clear()
        self.tmp.cleanup()

    def view(self, store=None):
        return pipeline.view(board.read(self.board_path), store or pipeline.default_store())

    def step(self, v, stage, name):
        return next(s for s in v["steps"] if s["stage"] == stage and s["name"] == name)


class PipelineRules(Base):
    def test_ready_when_previous_done(self):
        s = self.step(self.view(), "training", "Aa")
        self.assertEqual((s["kind"], s["view"]), ("ready", "todo"))

    def test_waiting_when_previous_open(self):
        v = self.view()
        self.assertEqual(self.step(v, "shengbte", "Aa")["kind"], "waiting")
        self.assertEqual(self.step(v, "training", "Cc")["kind"], "waiting")
        self.assertIn("sent", self.step(v, "training", "Cc")["rule"])

    def test_variant_without_own_step_needs_a_check(self):
        v = self.view()
        self.assertEqual(self.step(v, "shengbte", "Bb rfe")["kind"], "attention")
        self.assertIsNone(self.step(v, "shengbte", "Bb ls")["kind"])

    def test_variants_follow_their_material(self):
        names = [(lane["name"], lane["parent"]) for lane in self.view()["lanes"]]
        self.assertEqual(names, [("Aa", None), ("AaTorch", "Aa"), ("Bb", None), ("Bb rfe", "Bb"), ("Bb ls", "Bb"), ("Cc", None)])

    def test_potential_row_does_not_borrow_vasp(self):
        store = pipeline.default_store()
        self.assertEqual(self.step(self.view(store), "training", "AaTorch")["prev"], "vasp__Aa")
        store["potential"] = ["AaTorch"]
        self.assertIsNone(self.step(self.view(store), "training", "AaTorch")["prev"])

    def test_polar_note(self):
        store = pipeline.default_store()
        store["polar"] = ["Aa"]
        self.assertIn("--lr", self.step(self.view(store), "training", "Aa")["rule"])

    def test_counts_and_order(self):
        v = self.view()
        self.assertEqual(v["counts"], {"ready": 2, "attention": 1, "waiting": 2})
        kinds = [next(s["kind"] for s in v["steps"] if s["id"] == i) for i in v["next"]]
        self.assertEqual(kinds, sorted(kinds, key=["ready", "attention", "waiting"].index))


class PipelineEdits(Base):
    def test_add_process_and_step_changes_the_rule(self):
        store = pipeline.default_store()
        pipeline.apply(store, "add_stage", {"label": "Relaxation", "after": "__start"})
        self.assertEqual(store["stages"][0]["label"], "Relaxation")
        pipeline.apply(store, "add_step", {"stage": store["stages"][0]["id"], "name": "Zz"})
        time.sleep(0.002)
        pipeline.apply(store, "add_stage", {"label": "Report"})
        pipeline.apply(store, "add_step", {"stage": store["stages"][-1]["id"], "name": "Zz"})
        v = self.view(store)
        first, last = [s for s in v["steps"] if s["name"] == "Zz"]
        self.assertEqual((first["kind"], last["kind"]), ("ready", "waiting"))
        pipeline.apply(store, "set_state", {"id": first["id"], "state": "done"})
        self.assertEqual([s for s in self.view(store)["steps"] if s["name"] == "Zz"][1]["kind"], "ready")

    def test_remove_and_restore_process_keeps_steps(self):
        store = pipeline.default_store()
        pipeline.apply(store, "remove_stage", {"id": "vasp"})
        self.assertFalse([s for s in self.view(store)["steps"] if s["stage"] == "vasp"])
        pipeline.apply(store, "add_stage", {"label": "vasp", "after": "__start"})
        self.assertEqual(store["stages"][0]["id"], "vasp")
        self.assertTrue([s for s in self.view(store)["steps"] if s["stage"] == "vasp"])

    def test_duplicate_process_refused(self):
        with self.assertRaises(pipeline.PipelineError):
            pipeline.apply(pipeline.default_store(), "add_stage", {"label": "training"})

    def test_move_process(self):
        store = pipeline.default_store()
        pipeline.apply(store, "move_stage", {"id": "vasp", "direction": "right"})
        self.assertEqual([s["id"] for s in store["stages"]], ["training", "vasp", "shengbte"])
        with self.assertRaises(pipeline.PipelineError):
            pipeline.apply(store, "move_stage", {"id": "training", "direction": "left"})

    def test_hide_row_and_board_step_leaves_board_alone(self):
        store = pipeline.default_store()
        with open(self.board_path, encoding="utf-8") as f:
            before = f.read()
        pipeline.apply(store, "remove_lane", {"name": "Cc"})
        pipeline.apply(store, "remove_step", {"id": "vasp__Aa"})
        v = self.view(store)
        self.assertNotIn("Cc", [lane["name"] for lane in v["lanes"]])
        self.assertNotIn("vasp__Aa", [s["id"] for s in v["steps"]])
        with open(self.board_path, encoding="utf-8") as f:
            self.assertEqual(before, f.read())
        pipeline.apply(store, "show_lane", {"name": "Cc"})
        pipeline.apply(store, "show_steps", {})
        self.assertIn("Cc", [lane["name"] for lane in self.view(store)["lanes"]])

    def test_board_step_cannot_be_changed_in_the_store(self):
        with self.assertRaises(pipeline.PipelineError):
            pipeline.apply(pipeline.default_store(), "set_state", {"id": "vasp__Aa", "state": "done"})

    def test_store_round_trip(self):
        path = os.path.join(self.dir, "pipeline.local.json")
        store = pipeline.default_store()
        pipeline.apply(store, "add_lane", {"name": "Dd", "parent": ""})
        pipeline.save(path, store)
        self.assertIn("Dd", [lane["name"] for lane in pipeline.view(None, pipeline.load(path))["lanes"]])


class BoardAndJobs(Base):
    def test_board_missing_is_none(self):
        self.assertIsNone(board.read(os.path.join(self.dir, "nothing.json")))
        self.assertIsNone(board.read(""))

    def test_board_write_needs_the_tool(self):
        with self.assertRaises(board.BoardError):
            board.set_state(self.settings, "vasp", "Aa", "done")
        with self.assertRaises(board.BoardError):
            board.set_state(self.settings, "vasp", "Aa", "failed")

    def test_board_write_goes_through_the_tool(self):
        tool = os.path.join(self.dir, "tool.py")
        with open(tool, "w", encoding="utf-8") as f:
            f.write("import sys, json\nwith open(sys.argv[0] + '.log', 'w') as f:\n    f.write(json.dumps(sys.argv[1:]))\n")
        self.settings.data["board"]["tool"] = tool
        board.set_state(self.settings, "training", "Aa", "sent")
        with open(tool + ".log") as f:
            self.assertEqual(json.load(f), ["set", "training", "Aa", "enviado", "--by", "command-room"])

    def test_local_jobs_hide_rule(self):
        folder = os.path.join(self.dir, "jobs")
        os.makedirs(folder)
        now = time.time()
        for name, state, age in (("run", "running", 5000), ("fresh", "done", 100), ("old", "done", 900), ("bad", "failed", 301)):
            with open(os.path.join(folder, name + ".json"), "w") as f:
                json.dump({"name": name, "state": state, "updated": now - age, "step": 1, "total": 2}, f)
        got = jobs.local(folder, now)
        self.assertEqual(sorted(j["name"] for j in got["live"]), ["fresh", "run"])
        self.assertEqual(sorted(j["name"] for j in got["history"]), ["bad", "old"])
        self.assertIsNone(jobs.local(os.path.join(self.dir, "none")))

    def test_parse_qstat(self):
        text = ("\nserver:\n                                                                         Req'd  Req'd   Elap\n"
                "Job ID               Username Queue    Jobname          SessID NDS   TSK Memory Time  S Time\n"
                "-------------------- -------- -------- ---------------- ------ ----- --- ------ ----- - -----\n"
                "4705.server          someone  batch    Rattle_01          1234     1  24    --  12:00 R 01:23\n"
                "4706.server          someone  batch    train-DFT            --     1  24    --  24:00 Q   -- \n")
        got = jobs.parse_qstat(text)
        self.assertEqual([(j["id"], j["name"], j["state"], j["elapsed"]) for j in got],
                         [("4705", "Rattle_01", "running", "01:23"), ("4706", "train-DFT", "queued", "")])
        self.assertEqual(jobs.parse_qstat(""), [])

    def test_parse_squeue(self):
        got = jobs.parse_squeue("991|vasp_Aa_1_20|RUNNING|1:02:03|1-00:00:00|4|node[1-4]\n992|vasp_Bb|PENDING|0:00|1-00:00:00|4|(Priority)\n")
        self.assertEqual([(j["id"], j["state"], j["nodes"]) for j in got], [("991", "running", "4"), ("992", "queued", "4")])

    def test_match_job_to_row(self):
        lanes = [{"name": "Aa"}, {"name": "AaTorch"}, {"name": "Bb rfe"}]
        self.assertEqual(jobs.match_step("bte-AATORCH-rfe", lanes, []), "AaTorch")
        self.assertEqual(jobs.match_step("vasp_Bbrfe_3", lanes, []), "Bb rfe")
        self.assertIsNone(jobs.match_step("something", lanes, []))


def fake_ssh(folder, reply, code=0):
    """A stand-in for ssh: writes what it was asked to run to a log and prints a fixed reply."""
    log = os.path.join(folder, "ssh.log")
    path = os.path.join(folder, "fake_ssh.py")
    with open(path, "w", encoding="utf-8") as f:
        f.write("import sys\n"
                f"with open({log!r}, 'ab') as f:\n"
                "    f.write((' '.join(sys.argv[1:]) + '\\n---\\n').encode() + sys.stdin.buffer.read() + b'\\n===\\n')\n"
                f"sys.stdout.write({reply!r})\nsys.exit({code})\n")
    if os.name == "nt":
        launcher = os.path.join(folder, "fake_ssh.cmd")
        with open(launcher, "w") as f:
            f.write(f'@"{sys.executable}" "{path}" %*\n')
    else:
        launcher = os.path.join(folder, "fake_ssh.sh")
        with open(launcher, "w") as f:
            f.write(f'#!/bin/sh\nexec "{sys.executable}" "{path}" "$@"\n')
        os.chmod(launcher, os.stat(launcher).st_mode | stat.S_IEXEC)
    os.environ["COMMANDROOM_SSH"] = launcher
    return log


def text_of(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


class RemoteAndLaunch(Base):
    STAGE = {"id": "training", "label": "Training"}

    def test_switched_off_cluster_is_never_contacted(self):
        log = fake_ssh(self.dir, "should not run")
        with self.assertRaises(remote.RemoteError):
            remote.queue(self.settings, "torque")
        self.assertFalse(os.path.exists(log))

    def test_queue_reads_when_switched_on(self):
        log = fake_ssh(self.dir, "4705.s  u  batch  job_Aa  1  1  24  --  12:00 R 00:10\n")
        self.settings.cluster("torque")["enabled"] = True
        got = remote.queue(self.settings, "torque")
        self.assertEqual(got[0]["name"], "job_Aa")
        sent = text_of(log)
        self.assertIn("BatchMode=yes", sent)
        self.assertIn("qstat -u u", sent)
        with open(log, "rb") as f:
            self.assertNotIn(b"\r", f.read(), "commands must reach the cluster with Unix line ends")

    def test_plan_commands(self):
        plan = launch.prepare(self.settings, "torque", "/data/Aa/all/DFT/HiPhive2", self.STAGE, "fit", {})
        self.assertEqual(plan["dry"], "python /data/tools/hipipe.py fit --dry-run")
        self.assertEqual(plan["real"], "python /data/tools/hipipe.py fit --submit")
        plan = launch.prepare(self.settings, "torque", "/data/Aa", self.STAGE, "shells", {"c3": "7.05", "c4": "4.48"})
        self.assertEqual(plan["real"], "python /data/tools/hipipe.py shells --c3 7.05 --c4 4.48 --write")
        plan = launch.prepare(self.settings, "torque", "/data/Aa", {"id": "vasp", "label": "VASP"}, "pre", {"n": "5"})
        self.assertEqual(plan["dry"], "python /data/tools/hipipe.py pre --n 5 --dry-run")

    def test_plan_refuses_bad_input(self):
        with self.assertRaises(launch.LaunchError):
            launch.prepare(self.settings, "torque", "relative/folder", self.STAGE, "fit", {})
        with self.assertRaises(launch.LaunchError):
            launch.prepare(self.settings, "torque", "/data/Aa", {"id": "vasp", "label": "VASP"}, "pre", {"n": "five; rm -rf /"})
        with self.assertRaises(launch.LaunchError):
            launch.prepare(self.settings, "slurm", "/data/Aa", self.STAGE, "fit", {})

    def test_polar_notes(self):
        plan = launch.prepare(self.settings, "torque", "/data/Aa", self.STAGE, "fit", {}, polar=True)
        self.assertTrue(any("--lr" in n for n in plan["notes"]))

    def test_submit_needs_dry_run_and_confirmation(self):
        log = fake_ssh(self.dir, "writing train.job\n")
        self.settings.cluster("torque")["enabled"] = True
        plan = launch.prepare(self.settings, "torque", "/data/Aa", self.STAGE, "fit", {})
        with self.assertRaises(launch.LaunchError):
            launch.submit(self.settings, plan["token"], plan["token"])
        self.assertFalse(os.path.exists(log))
        launch.dry_run(self.settings, plan["token"])
        self.assertIn("--dry-run", text_of(log))
        self.assertNotIn("--submit", text_of(log))
        with self.assertRaises(launch.LaunchError):
            launch.submit(self.settings, plan["token"], "wrong")
        result = launch.submit(self.settings, plan["token"], plan["token"])
        self.assertTrue(result["ok"])
        sent = text_of(log)
        self.assertIn("cd /data/Aa || exit 3", sent)
        self.assertIn("hipipe.py fit --submit", sent)
        with self.assertRaises(launch.LaunchError):
            launch.submit(self.settings, plan["token"], plan["token"])

    def test_failed_dry_run_blocks_submit(self):
        fake_ssh(self.dir, "error: set ngrid in hipipe.cfg\n", code=1)
        self.settings.cluster("torque")["enabled"] = True
        plan = launch.prepare(self.settings, "torque", "/data/Aa", self.STAGE, "fit", {})
        self.assertFalse(launch.dry_run(self.settings, plan["token"])["dry_ok"])
        with self.assertRaises(launch.LaunchError):
            launch.submit(self.settings, plan["token"], plan["token"])

    def test_custom_process_has_no_dry_run(self):
        stage = {"id": "x-report", "label": "Report", "command": "python make_report.py"}
        plan = launch.prepare(self.settings, "torque", "/data/Aa", stage, "run", {})
        self.assertIsNone(plan["dry"])
        self.assertEqual(plan["real"], "python make_report.py")


if __name__ == "__main__":
    unittest.main()

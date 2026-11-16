"""Tests of the "you run it" mode: for such a cluster Command Room only writes commands and reads what the
user pastes back. It must never start ssh for it, whatever the settings say.

run:  python -m unittest discover -s tests   (from the command-room folder)
"""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from commandroom import launch, remote  # noqa: E402
from commandroom.server import App  # noqa: E402
from commandroom.settings import Settings  # noqa: E402

SQUEUE = "991|vasp_Aa_1_20|RUNNING|1:02:03|1-00:00:00|4|node[1-4]\n992|vasp_Bb|PENDING|0:00|1-00:00:00|4|(Priority)\n"


class Manual(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        d = self.tmp.name
        with open(os.path.join(d, "datos.json"), "w", encoding="utf-8") as f:
            json.dump({"version": 1, "history": [], "items": [
                {"id": "vasp__Aa", "stage": "vasp", "name": "Aa", "status": "terminado", "updated": "", "note": ""},
                {"id": "training__Aa", "stage": "training", "name": "Aa", "status": "faltan", "updated": "", "note": ""}]}, f)
        with open(os.path.join(d, "settings.local.json"), "w", encoding="utf-8") as f:
            json.dump({"board": {"data": os.path.join(d, "datos.json")}, "clusters": [
                {"id": "slurm", "label": "South", "scheduler": "slurm", "mode": "manual", "enabled": True, "host": "h2", "user": "u2",
                 "tools": "/data/tools", "activate": "module load x", "sender": "/home/me/send.sh"}]}, f)
        self.app = App(Settings(os.path.join(d, "settings.local.json")))
        self.trap = os.path.join(d, "ssh-was-started")
        launcher = os.path.join(d, "trap.cmd" if os.name == "nt" else "trap.sh")
        with open(launcher, "w") as f:
            f.write(f'@echo x > "{self.trap}"\n' if os.name == "nt" else f'#!/bin/sh\necho x > "{self.trap}"\n')
        if os.name != "nt":
            os.chmod(launcher, 0o755)
        os.environ["COMMANDROOM_SSH"] = launcher

    def tearDown(self):
        os.environ.pop("COMMANDROOM_SSH", None)
        launch._plans.clear()
        self.tmp.cleanup()

    def test_never_logs_in_even_if_switched_on(self):
        for call in (lambda: remote.queue(self.app.settings, "slurm"), lambda: remote.find_folders(self.app.settings, "slurm", "Aa"),
                     lambda: self.app.post("/api/queue", {"id": "slurm"}), lambda: self.app.state()):
            try:
                call()
            except remote.RemoteError:
                pass
        with self.assertRaises(remote.RemoteError) as refused:
            remote.run(self.app.settings, "slurm", "hostname")
        self.assertIn("run by you", str(refused.exception))
        with self.assertRaises(remote.RemoteError):
            self.app.post("/api/cluster", {"id": "slurm", "enabled": True})
        self.assertFalse(os.path.exists(self.trap))

    def test_state_gives_the_command_to_copy(self):
        c = self.app.state()["clusters"][0]
        self.assertEqual((c["mode"], c["enabled"], c["jobs"]), ("manual", False, None))
        self.assertEqual(c["command"], "squeue -u u2 -h -o '%i|%j|%T|%M|%l|%D|%R'")

    def test_pasted_queue_is_read(self):
        self.assertIn("2 jobs", self.app.post("/api/paste", {"id": "slurm", "text": SQUEUE})["message"])
        c = self.app.state()["clusters"][0]
        self.assertEqual([(j["id"], j["state"]) for j in c["jobs"]], [("991", "running"), ("992", "queued")])
        self.app.post("/api/paste", {"id": "slurm", "text": ""})
        self.assertEqual(self.app.state()["clusters"][0]["jobs"], [])

    def test_launch_gives_commands_and_waits_for_the_paste(self):
        plan = self.app.post("/api/launch/prepare", {"step": "training__Aa", "action": "fit", "cluster": "slurm", "folder": "/scratch/Aa", "fields": {}})["plan"]
        self.assertTrue(plan["manual"])
        self.assertEqual(plan["copy_dry"], "cd /scratch/Aa || exit 3\nmodule load x\npython /data/tools/hipipe.py fit --dry-run")
        self.assertTrue(plan["copy_real"].endswith("hipipe.py fit --submit"))
        with self.assertRaises(launch.LaunchError):
            self.app.post("/api/launch/dry", {"token": plan["token"]})
        with self.assertRaises(launch.LaunchError):
            self.app.post("/api/launch/submit", {"token": plan["token"], "confirm": plan["token"]})
        with self.assertRaises(launch.LaunchError):
            self.app.post("/api/launch/sent", {"token": plan["token"]})
        bad = self.app.post("/api/launch/pasted", {"token": plan["token"], "text": "error: set ngrid in hipipe.cfg"})["plan"]
        self.assertFalse(bad["dry_ok"])
        good = self.app.post("/api/launch/pasted", {"token": plan["token"], "text": "writing train.job\npython wrapper -m post"})["plan"]
        self.assertTrue(good["dry_ok"])
        self.assertTrue(self.app.post("/api/launch/sent", {"token": plan["token"]})["ok"])
        self.assertFalse(os.path.exists(self.trap))

    def test_sender_commands(self):
        got = self.app.post("/api/sender", {"id": "slurm", "folder": "Rattle30", "only": "Aa,Bb"})["commands"]
        self.assertEqual(got["dry"], 'bash "/home/me/send.sh" u2@h2 "Rattle30" --only Aa,Bb --dry-run')
        self.assertEqual(got["status"], 'bash "/home/me/send.sh" u2@h2 "Rattle30" --only Aa,Bb --status')
        for folder, only in (("", ""), ('x"; rm -rf ~', ""), ("ok", "a; b")):
            with self.assertRaises(remote.RemoteError):
                self.app.post("/api/sender", {"id": "slurm", "folder": folder, "only": only})


if __name__ == "__main__":
    unittest.main()

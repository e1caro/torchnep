"""Tests of runs on this computer that outlive a restart of Command Room.

run:  python -m unittest discover -s tests   (from the command-room folder)
"""
import json
import os
import subprocess
import sys
import tempfile
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from commandroom import local  # noqa: E402


def sleeper():
    flags = subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP if local.WINDOWS else 0
    return subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)"], creationflags=flags, start_new_session=not local.WINDOWS)


class Restart(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.folder = self.tmp.name
        self.procs = []

    def tearDown(self):
        for p in self.procs:
            if p.poll() is None:
                p.kill()
            p.wait()
        self.tmp.cleanup()

    def record(self, run_id, pid, started):
        meta = {"id": run_id, "label": run_id, "state": "running", "pid": pid, "started": started, "ended": None, "code": None}
        with open(os.path.join(self.folder, run_id + ".json"), "w", encoding="utf-8") as f:
            json.dump(meta, f)

    def test_a_run_still_going_after_a_restart_stays_running(self):
        p = sleeper()
        self.procs.append(p)
        self.record("20260101_000000_a", p.pid, time.time())
        runs = local.Runs(self.folder)
        self.assertEqual(runs.listing()[0]["state"], "running")
        self.assertEqual(runs.metas()[0]["state"], "running")

    def test_a_run_whose_process_is_gone_is_unknown(self):
        p = sleeper()
        p.kill()
        p.wait()
        self.record("20260101_000000_b", p.pid, time.time())
        self.assertEqual(local.Runs(self.folder).listing()[0]["state"], "unknown")

    @unittest.skipUnless(local.WINDOWS, "the creation time is only compared on Windows")
    def test_another_program_with_the_same_number_is_not_taken_for_the_run(self):
        p = sleeper()
        self.procs.append(p)
        self.record("20260101_000000_c", p.pid, time.time() - 3600)
        self.assertEqual(local.Runs(self.folder).listing()[0]["state"], "unknown")

    def test_stop_ends_a_run_started_before_the_restart(self):
        p = sleeper()
        self.procs.append(p)
        self.record("20260101_000000_d", p.pid, time.time())
        runs = local.Runs(self.folder)
        runs.stop("20260101_000000_d")
        p.wait(timeout=20)
        self.assertEqual(runs.listing()[0]["state"], "stopped")

    def test_stop_refuses_a_run_that_has_ended(self):
        self.record("20260101_000000_e", 0, time.time())
        with self.assertRaises(local.LocalError):
            local.Runs(self.folder).stop("20260101_000000_e")


if __name__ == "__main__":
    unittest.main()

"""Tests of the rows a launch makes in the pipeline and of the reader of collected VASP calculations.

run:  python -m unittest discover -s tests   (from the command-room folder)
"""
import os
import sys
import tempfile
import time
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from commandroom import launchers, pipeline, tracks, vasp  # noqa: E402

BTE = launchers._launcher({"id": "pot-bte", "process": "bte", "label": "Potentials to ShengBTE", "shell": "bash", "contacts": "north", "sends": True,
                           "command": "bash go.sh {models}", "fields": [{"name": "models", "label": "Models", "kind": "models", "required": True}],
                           "track": {"group": "Potentials to ShengBTE", "material": "Ge", "rows": "models", "skip": "^== {row}: .*already exists",
                                     "steps": [{"stage": "vasp", "label": "Forces", "local": True, "until": "{row}: upload"},
                                               {"stage": "training", "label": "Fit", "jobs": "^\\s*{row} fit (?P<id>\\d+)"},
                                               {"stage": "shengbte", "label": "ShengBTE", "parts": [
                                                   {"label": "least squares", "jobs": "^\\s*{row} ls (?P<id>\\d+)", "result": "kappa:POT_{row}_ls"},
                                                   {"label": "RFE", "jobs": "^\\s*{row} rfe (?P<id>\\d+)", "result": "kappa:POT_{row}_rfe"}]}]}}, {"bte"})
SEND = launchers._launcher({"id": "send", "process": "send", "label": "Send a tree", "shell": "bash", "contacts": "north", "sends": True,
                            "command": "bash send.sh {folder}{only}", "fields": [{"name": "folder", "label": "Folder", "required": True}, {"name": "only", "label": "Only", "format": " --only {value}"}],
                            "track": {"group": "VASP sent", "material": "{folder|material}", "row": "{folder|base}",
                                      "steps": [{"stage": "vasp", "label": "VASP", "parts": [{"jobs": "^\\s*(?P<part>job-\\S+) queued as (?P<id>\\d+)"},
                                                                                           {"label": "collected", "result": "vasp:{folder|base}_results", "awaits": True}]}]}}, {"send"})
LOG = "== 10:00 A_1: forces\n== 10:02 A_1: upload\n   A_1 fit 11.north\n   A_1 ls 12.north\n   A_1 rfe 13.north\n== 10:03 B.2: forces\n"


def run(state="running", **more):
    return dict({"id": "r1", "label": "Potentials to ShengBTE", "launcher": "pot-bte", "values": {"models": "A_1 B.2"}, "command": "bash go.sh A_1 B.2",
                 "state": state, "started": 1000.0, "ended": None if state == "running" else 2000.0}, **more)


def build(runs, queue, results=(), gone=None, fetched=None, log=LOG, known=(BTE, SEND)):
    have = {r: {"kind": r.split(":")[0], "key": r.split(":")[1], "text": "here", "short": "42"} for r in results}
    return tracks.build(runs, list(known), {"north": queue}, lambda _id: log, have.get, {} if gone is None else gone, fetched or {})


def step(row, stage):
    return next(s for s in row["steps"] if s["stage"] == stage)


class TracksCase(unittest.TestCase):
    def test_one_row_per_model_with_the_state_of_each_part(self):
        queue = {"read": 1500.0, "jobs": [{"id": "11", "state": "running", "elapsed": "00:03"}, {"id": "12", "state": "held"}, {"id": "13", "state": "held"}]}
        rows = build([run()], queue)
        self.assertEqual([r["name"] for r in rows], ["A_1", "B.2"])
        a, b = rows
        self.assertEqual((a["material"], a["group"]), ("Ge", "Potentials to ShengBTE"))
        self.assertEqual([s["state"] for s in a["steps"]], ["done", "sent", "sent"])
        self.assertEqual([(p["job"], p["brief"]) for p in step(a, "shengbte")["parts"]], [("12", "held"), ("13", "held")])
        self.assertEqual([s["state"] for s in b["steps"]], ["sent", "todo", "todo"])
        self.assertEqual(tracks.job_rows(rows), {"north:11": "A_1", "north:12": "A_1", "north:13": "A_1"})

    def test_a_job_that_left_the_queue_is_done_only_with_its_result(self):
        gone, queue = {}, {"read": 3000.0, "jobs": []}
        rows = build([run("done")], queue, results=["kappa:POT_A_1_ls"], gone=gone)
        a = rows[0]
        self.assertEqual(step(a, "training")["state"], "done")
        ls, rfe = step(a, "shengbte")["parts"]
        self.assertEqual((ls["state"], ls["brief"]), ("done", "42"))
        self.assertEqual((rfe["state"], rfe["brief"]), ("sent", "fetching"))
        self.assertEqual(gone["north:13"], 3000.0)
        late = build([run("done")], queue, results=["kappa:POT_A_1_ls"], gone=gone, fetched={"north": 3100.0})
        self.assertEqual(step(late[0], "shengbte")["parts"][1]["state"], "failed")
        self.assertEqual(step(late[0], "shengbte")["state"], "failed")

    def test_a_queue_read_before_the_launch_ended_says_nothing(self):
        rows = build([run("done")], {"read": 1500.0, "jobs": []})
        self.assertEqual(step(rows[0], "training")["parts"][0]["brief"], "sent")
        rows = build([run("done")], {"read": None, "jobs": None})
        self.assertEqual(step(rows[0], "shengbte")["state"], "sent")

    def test_a_failed_launch_marks_what_it_never_queued(self):
        rows = build([run("failed")], {"read": 3000.0, "jobs": []})
        b = rows[1]
        self.assertEqual([s["state"] for s in b["steps"]], ["failed", "failed", "failed"])
        self.assertEqual(step(b, "training")["parts"][0]["brief"], "not queued")

    def test_a_model_launched_twice_is_shown_once_and_a_skipped_one_keeps_its_first_launch(self):
        again = run("done", id="r2", started=5000.0, ended=5100.0, values={"models": "A_1"}, command="bash go.sh A_1")
        logs = {"r1": LOG, "r2": "== A_1: POT_A_1 already exists on the cluster, skipped\n"}
        rows = tracks.build([run("done"), again], [BTE], {"north": {"read": 6000.0, "jobs": []}}, logs.get, lambda ref: None, {}, {})
        self.assertEqual([(r["name"], r["run"]) for r in rows], [("A_1", "r1"), ("B.2", "r1")])

    def test_an_old_run_without_its_launcher_is_recognised_by_its_command(self):
        old = {"id": "r0", "label": "Potentials to ShengBTE", "command": "bash go.sh 'A_1' B.2", "state": "done", "started": 10.0, "ended": 20.0}
        self.assertEqual(tracks.unrender(BTE, old["command"]), {"models": "A_1 B.2"})
        self.assertEqual(len(build([old], {"read": 30.0, "jobs": []})), 2)
        self.assertEqual(tracks.unrender(BTE, "something else"), {})

    def test_a_tree_of_jobs_makes_one_part_per_job_and_waits_for_the_collect(self):
        meta = {"id": "s1", "label": "Send a tree", "launcher": "send", "values": {"folder": "C:/me/Si_data/Rattle9", "only": "1-2"}, "state": "done", "started": 1.0, "ended": 2.0}
        log = "uploading 2 folders ...\n  job-01 queued as 50.north\n  job-02 queued as 51.north\n"
        rows = build([meta], {"read": 9.0, "jobs": [{"id": "51", "state": "queued"}]}, log=log)
        self.assertEqual((rows[0]["material"], rows[0]["name"]), ("Si", "Rattle9"))
        parts = rows[0]["steps"][0]["parts"]
        self.assertEqual([(p["label"], p["state"]) for p in parts], [("job-01", "done"), ("job-02", "sent"), ("collected", "todo")])
        self.assertEqual(rows[0]["steps"][0]["state"], "sent")
        rows = build([meta], {"read": 9.0, "jobs": []}, results=["vasp:Rattle9_results"], log=log)
        self.assertEqual(rows[0]["steps"][0]["state"], "done")

    def test_a_launch_run_by_hand_stays_sent_until_its_result_is_here(self):
        meta = {"id": "h1", "label": "Send a tree", "launcher": "send", "values": {"folder": "/x/DATA/MgO/set"}, "state": "byhand", "started": 1.0, "ended": 1.0}
        rows = build([meta], {"read": None, "jobs": None}, log="")
        self.assertEqual(rows[0]["material"], "MgO")
        self.assertEqual([(p["state"], p["brief"]) for p in rows[0]["steps"][0]["parts"]], [("sent", "by you"), ("todo", "to collect")])

    def test_a_part_waits_for_its_turn_until_the_launch_prints_its_start(self):
        chain = launchers._launcher({"id": "chain", "process": "train", "label": "Chain", "shell": "bash", "command": "bash chain.sh {models}",
                                     "fields": [{"name": "models", "label": "Models", "kind": "models"}],
                                     "track": {"group": "Trained here", "material": "Ge", "rows": "models",
                                               "steps": [{"stage": "training", "label": "Training", "result": "potential:{row}", "starts": "^== {row}: start"}]}}, {"train"})
        meta = {"id": "c1", "label": "Chain", "launcher": "chain", "values": {"models": "A B C"}, "state": "running", "started": 1.0, "ended": None}
        rows = build([meta], {}, results=["potential:A"], log="== A: start\n== B: start\n", known=(chain,))
        self.assertEqual([(r["name"], r["steps"][0]["state"], r["steps"][0]["parts"][0]["brief"]) for r in rows], [("A", "done", "42"), ("B", "sent", "running"), ("C", "todo", "waiting")])
        rows = build([dict(meta, state="failed", ended=9.0)], {}, results=["potential:A"], log="== A: start\n== B: start\n", known=(chain,))
        self.assertEqual([r["steps"][0]["state"] for r in rows], ["done", "failed", "failed"])
        self.assertEqual(rows[2]["steps"][0]["parts"][0]["brief"], "not started")

    def test_templates(self):
        self.assertEqual(tracks.fill("{folder|base}_results", {"folder": "C:\\a\\Ge_data\\Set7\\"}), "Set7_results")
        self.assertEqual(tracks.fill("{material|or=Si}", {"material": " "}), "Si")
        self.assertEqual(tracks.fill("^{row} fit", {"row": "A.1+"}, True), "^A\\.1\\+ fit")
        self.assertEqual(tracks.material_in("../CoSb3_data/x"), "CoSb3")
        self.assertIsNone(tracks.spec({"track": {"steps": "no"}}))

    def test_the_rows_go_under_their_material_in_the_pipeline(self):
        rows = build([run()], {"read": 1500.0, "jobs": [{"id": "11", "state": "running"}]})
        board = {"items": [{"id": "b1", "stage": "vasp", "name": "Ge", "state": "done", "updated": "", "note": ""},
                           {"id": "b2", "stage": "vasp", "name": "Si", "state": "done", "updated": "", "note": ""}]}
        v = pipeline.view(board, pipeline.default_store(), rows)
        self.assertEqual([(lane["name"], lane["parent"], lane.get("group")) for lane in v["lanes"]],
                         [("Ge", None, None), ("A_1", "Ge", "Potentials to ShengBTE"), ("B.2", "Ge", "Potentials to ShengBTE"), ("Si", None, None)])
        mine = [s for s in v["steps"] if s["name"] == "A_1"]
        self.assertEqual([(s["stage"], s["state"], s["source"]) for s in mine], [("vasp", "done", "launch"), ("training", "sent", "launch"), ("shengbte", "sent", "launch")])
        self.assertEqual(mine[1]["prev"], mine[0]["id"])
        self.assertEqual(v["counts"], {"ready": 0, "attention": 0, "waiting": 0})
        store = pipeline.default_store()
        pipeline.apply(store, "remove_lane", {"name": "A_1"})
        self.assertNotIn("A_1", [lane["name"] for lane in pipeline.view(board, store, rows)["lanes"]])
        other = pipeline.view({"items": []}, pipeline.default_store(), rows)
        self.assertEqual(other["lanes"][0]["name"], "Ge")


OUTCAR = """ running on   24 total cores
   VRHFIN =C: s2p2
   ions per type =               2
   ENCUT  =  500.0 eV
   number of dos      NEDOS =    301   number of ions     NIONS =      2
  volume of cell :       11.40
  external pressure =       -0.13 kB  Pullay stress =        0.00 kB
 POSITION                                       TOTAL-FORCE (eV/Angst)
 -----------------------------------------------------------------------------------
      0.00000      0.00000      0.00000         0.300000      0.000000      0.400000
      0.89000      0.89000      0.89000        -0.300000      0.000000     -0.400000
 -----------------------------------------------------------------------------------
  free  energy   TOTEN  =       -18.20000000 eV
"""


class VaspCase(unittest.TestCase):
    def test_an_outcar_is_read(self):
        d = vasp.parse_outcar(OUTCAR + " General timing and accounting informations for this job:\n                         Elapsed time (sec):      360.000\n")
        self.assertEqual((d["material"], d["atoms"], d["cores"], d["ended"], d["seconds"]), ("C", 2, 24, True, 360.0))
        self.assertAlmostEqual(d["per_atom"], -9.1)
        self.assertAlmostEqual(d["fmax"], 0.5)
        self.assertAlmostEqual(d["frms"], 0.5 / 3 ** 0.5)
        self.assertFalse(vasp.parse_outcar(OUTCAR)["ended"])

    def test_a_folder_of_calculations_is_a_set_and_is_read_once(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = os.path.join(tmp, "Ge_data", "Rattle5_results")
            for name, text in (("job-02", OUTCAR), ("job-10", OUTCAR + " General timing and accounting\n Elapsed time (sec): 3600.0\n")):
                os.makedirs(os.path.join(root, name))
                with open(os.path.join(root, name, "OUTCAR"), "w") as f:
                    f.write(text)
            os.makedirs(os.path.join(root, "empty"))
            cache = os.path.join(tmp, "cache.json")
            pattern = [os.path.join(tmp, "*_data", "*_results")]
            found = vasp.sets(pattern, cache)
            self.assertEqual(len(found), 1)
            s = found[0]
            self.assertEqual((s["id"], s["name"], s["material"], s["ended"], [j["job"] for j in s["jobs"]]), ("Ge_data/Rattle5", "Rattle5", "C", 1, ["job-02", "job-10"]))
            self.assertAlmostEqual(s["core_hours"], 24.0)
            self.assertTrue(os.path.isfile(cache))
            before = os.path.getmtime(cache)
            time.sleep(0.05)
            self.assertEqual(vasp.sets(pattern, cache)[0]["ended"], 1)
            self.assertEqual(os.path.getmtime(cache), before)
            self.assertEqual(vasp.find(pattern, "Rattle5_results")["count"], 3)
            self.assertEqual(vasp.find(pattern, "Rattle5")["id"], "Ge_data/Rattle5")
            self.assertIsNone(vasp.find(pattern, "Other"))
            self.assertEqual(vasp.stamp(pattern)[0], 3)

    def test_a_small_vasprun_is_read_when_there_is_no_outcar(self):
        xml = ('<modeling><atominfo><array name="atoms" ><set><rc><c>Si</c><c>   1</c></rc><rc><c>Si</c><c>   1</c></rc></set></array></atominfo>'
               '<calculation><varray name="forces" ><v>  0.1 0.0 0.0 </v><v> -0.1 0.0 0.0 </v></varray><energy><i name="e_fr_energy">  -10.8 </i></energy></calculation></modeling>\n')
        d = vasp.parse_vasprun(xml)
        self.assertEqual((d["material"], d["atoms"], d["ended"]), ("Si", 2, True))
        self.assertAlmostEqual(d["per_atom"], -5.4)
        self.assertAlmostEqual(d["fmax"], 0.1)


if __name__ == "__main__":
    unittest.main()

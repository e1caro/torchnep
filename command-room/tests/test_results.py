"""Tests of the result parsers. The numbers in these fixtures are invented on purpose (round values that are
easy to check); they test the file formats, not any physics.

run:  python -m unittest discover -s tests   (from the command-room folder)
"""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from commandroom import results  # noqa: E402

KAPPA_A = ("  300.0   0.10000E+03   0.1E-17  -0.7E-17   0.5E-17   0.20000E+03  -0.5E-18  -0.1E-16  -0.7E-18   0.30000E+03    15\n"
           "  400.0   0.50000E+02   0.1E-17  -0.7E-17   0.5E-17   0.50000E+02  -0.5E-18  -0.1E-16  -0.7E-18   0.50000E+02    13\n")
KAPPA_B = KAPPA_A.replace("0.10000E+03", "0.07000E+03").replace("0.50000E+02", "0.45000E+02")
CONTROL = "&crystal\n\t scell(:)=4 4 4\n&end\n&parameters\n\tT_min=300.0\n\tscalebroad=0.1\n&end\n\t ngrid(:)=22 22 22\n&flags\n\tnonanalytic=.FALSE.\n&end\n"
LOG = ("run demo: {} split tt\n"
       "epoch     1 loss 1.38441 lr 5.0e-05 train E 11.173 F 400.0 | test E 12.954 F 500.0 [16 s]\n"
       "epoch   250 loss 0.66969 lr 4.7e-05 train E 2.122 F 200.0 | test E 5.476 F 300.0 [47 s]\n"
       "after L-BFGS (4000 it) train E 0.450 F 10.0 | test E 0.833 F 150.0 [824 s]\n"
       "done in 825 s\n")


class Kappa(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = os.path.join(self.tmp.name, "material", "results")
        for name, text, grid in (("DFT_rfe", KAPPA_A, CONTROL), ("TORCH_x_rfe", KAPPA_B, CONTROL), ("TORCH_x_ls", KAPPA_B, CONTROL.replace("22 22 22", "8 8 8")), ("empty", "", "")):
            os.makedirs(os.path.join(self.root, name))
            if text:
                with open(os.path.join(self.root, name, "BTE.KappaTensorVsT_CONV"), "w") as f:
                    f.write(text)
                with open(os.path.join(self.root, name, "CONTROL"), "w") as f:
                    f.write(grid)

    def tearDown(self):
        self.tmp.cleanup()

    def test_mean_of_the_diagonal(self):
        rows = results.parse_kappa(KAPPA_A)
        self.assertEqual([r["T"] for r in rows], [300.0, 400.0])
        self.assertAlmostEqual(rows[0]["k"], 200.0)
        self.assertAlmostEqual(rows[1]["k"], 50.0)
        self.assertEqual(results.parse_kappa("not a table\n1 2 3\n"), [])

    def test_control(self):
        self.assertEqual(results.parse_control(CONTROL), {"ngrid": "22 22 22", "scell": "4 4 4", "scalebroad": "0.1", "nonanalytic": False, "material": ""})

    def test_runs_are_found_and_named(self):
        runs = results.kappa_runs([self.root])
        self.assertEqual([(r["name"], r["source"], r["method"]) for r in runs],
                         [("DFT_rfe", "DFT", "rfe"), ("TORCH_x_ls", "TORCH_x", "ls"), ("TORCH_x_rfe", "TORCH_x", "rfe")])
        self.assertEqual(results.kappa_runs([os.path.join(self.tmp.name, "nothing")]), [])

    def test_difference_to_reference(self):
        runs = {r["name"]: r for r in results.kappa_runs([self.root])}
        diff = results.difference(runs["TORCH_x_rfe"], runs["DFT_rfe"])
        self.assertAlmostEqual(diff[0]["pct"], -5.0)
        self.assertAlmostEqual(diff[1]["pct"], -10.0)

    def test_unfair_comparison_is_named(self):
        runs = {r["name"]: r for r in results.kappa_runs([self.root])}
        self.assertEqual(results.comparable(runs["TORCH_x_rfe"], runs["DFT_rfe"]), [])
        reasons = results.comparable(runs["TORCH_x_ls"], runs["DFT_rfe"])
        self.assertTrue(any("q-mesh" in r for r in reasons))
        self.assertTrue(any("fit method" in r for r in reasons))


class Potentials(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = os.path.join(self.tmp.name, "project", "runs")
        os.makedirs(self.root)
        for name, test in (("good", 1.0), ("bad", 3.0)):
            with open(os.path.join(self.root, name + ".json"), "w") as f:
                json.dump({"args": {"split": "tt"}, "cfg": {"rc_r": 6}, "seconds": 10,
                           "test": {"A": {"rel_pct": test, "F_meV_A": 5.0, "E_meV_atom": 0.1}, "B": {"rel_pct": test + 1, "F_meV_A": 6.0, "E_meV_atom": 0.1}},
                           "train": {"A": {"rel_pct": 0.5, "F_meV_A": 2.0, "E_meV_atom": 0.1}},
                           "rows": [{"src": "A", "job": "job-01", "dft_frms_meV": 100.0, "F_meV_A": 5.0, "rel_pct": 5.0, "E_meV_atom": 0.1, "test": True}]}, f)
        with open(os.path.join(self.root, "good.log"), "w") as f:
            f.write(LOG)
        with open(os.path.join(self.root, "notarun.json"), "w") as f:
            f.write("[1, 2]")

    def tearDown(self):
        self.tmp.cleanup()

    def test_training_curve(self):
        points = results.parse_training_log(LOG)
        self.assertEqual([(p["step"], p["train"], p["test"], p["phase"]) for p in points],
                         [(1, 400.0, 500.0, "Adam"), (250, 200.0, 300.0, "Adam"), (4250, 10.0, 150.0, "L-BFGS")])

    def test_runs_sorted_by_held_out_error(self):
        runs = results.potential_runs([self.root])
        self.assertEqual([r["name"] for r in runs], ["good", "bad"])
        self.assertAlmostEqual(runs[0]["test"], 1.5)
        self.assertAlmostEqual(runs[0]["train"], 0.5)

    def test_element_from_the_run_file(self):
        self.assertEqual(results.element_of({"element": "Ge"}, "x"), "Ge")
        self.assertEqual(results.element_of({"args": {"elements": ["Mg", "O"]}}, "x"), "MgO")
        self.assertEqual(results.element_of({"element": "Ge"}, "x", {"Si": {"names": ["x"]}}), "Ge")

    def test_element_from_the_rules(self):
        rules = {"Aa": {"splits": ["tt"], "sets": ["shared"]}, "Bb": {"names": ["K_*"], "sets": ["shared", "own"]}}
        run = {"args": {"split": "tt"}, "rows": [{"src": "own"}]}
        self.assertEqual(results.element_of(run, "K_1", rules), "Aa")
        self.assertEqual(results.element_of({"rows": [{"src": "other"}]}, "K_1", rules), "Bb")
        self.assertEqual(results.element_of({"test": {"own": {}, "all": {}}}, "run", rules), "Bb")
        self.assertEqual(results.element_of({"rows": [{"src": "other"}]}, "run", rules), "")

    def test_formula(self):
        self.assertEqual(results.formula("PbTe"), "PbTe")

    def test_a_conductivity_run_described_in_plain_words(self):
        run = {"source": "TORCH_x", "method": "rfe", "control": {"ngrid": "22 22 22", "scell": "4 4 4", "nonanalytic": False}, "conv": [1], "rta": []}
        about = {line["label"]: line["text"] for line in results.describe_kappa(run)}
        self.assertEqual(about["Forces"], "The forces come from the potential TORCH_x instead of VASP.")
        self.assertIn("RFE", about["Fit"])
        self.assertEqual(about["ShengBTE"], "Solved on a 22 22 22 q-mesh, with force constants from a 4 4 4 supercell. It has the iterative solution.")
        self.assertIn("VASP (DFT)", results.describe_kappa({"source": "DFT", "method": "", "control": {}})[0]["text"])

    def test_names_in_formulas(self):
        self.assertEqual([results.formula(x) for x in ("C", "MgO", "CoSb3", "Rattle30", "Hiphive1", "all", "")], ["C", "MgO", "CoSb3", "", "", "", ""])

    def test_material_of_a_control_file(self):
        self.assertEqual(results.control_material(" elements='C',\n types=1 1 1 1 1 1 1 1,\n"), "C")
        self.assertEqual(results.control_material(' elements="Co" "Sb"\n types=1 1 1 1 2 2 2 2 2 2 2 2 2 2 2 2\n'), "CoSb3")
        self.assertEqual(results.control_material(" elements='Mg','O'\n"), "MgO")
        self.assertEqual(results.control_material(CONTROL), "")

    def test_a_new_result_changes_the_stamp(self):
        cfg = {"kappa": [], "runs": [self.root]}
        before = results.stamp(cfg)
        with open(os.path.join(self.root, "new.json"), "w") as f:
            json.dump({"test": {}, "rows": [{"src": "MgO"}]}, f)
        self.assertNotEqual(results.stamp(cfg), before)
        self.assertEqual({r["name"]: r["element"] for r in results.potential_runs([self.root])}["new"], "MgO")

    def test_element_from_a_data_set_named_as_a_symbol(self):
        self.assertEqual(results.element_of({"rows": [{"src": "Si"}, {"src": "Rattle"}]}, "x"), "Si")
        self.assertEqual(results.element_of({"rows": [{"src": "Si"}, {"src": "C"}]}, "x"), "")
        self.assertEqual(results.element_of({"rows": [{"src": "Rattle"}]}, "C_2layer"), "")

    def test_runs_carry_their_element(self):
        runs = results.potential_runs([self.root], {"Aa": {"names": ["good"]}, "Cc": {"splits": ["tt"]}})
        self.assertEqual({r["name"]: r["element"] for r in runs}, {"good": "Cc", "bad": "Cc"})
        runs = results.potential_runs([self.root], {"Aa": {"names": ["good"]}})
        self.assertEqual({r["name"]: r["element"] for r in runs}, {"good": "Aa", "bad": "B"})

    def test_a_run_described_in_plain_words(self):
        data = {"cfg": {"rc_r": 7.0, "rc_a": 5.0, "n_r": 10, "n_a": 10, "k_r": 16, "k_a": 16, "lmax": 8, "hidden": [128], "act": "tanh"},
                "args": {"split": "fold3", "epochs": 1500, "lbfgs": 4000, "init": None, "seed": 1}, "n_params": 13303,
                "rows": [{"src": "A", "test": False}, {"src": "A", "test": False}, {"src": "B", "test": True}, {"src": "C", "test": False, "role": "unseen"}]}
        about = {line["label"]: line["text"] for line in results.describe_run(data)}
        self.assertIn("up to 7 Å for distances and 5 Å for angles", about["Model"])
        self.assertIn("one hidden layer of 128 neurons (tanh)", about["Model"])
        self.assertIn("13303 parameters", about["Model"])
        self.assertEqual(about["Data"], "Trained on 2 structures (A). Checked on 1 structure it never saw (B). 1 more was left out of both (C). This choice of structures is the split called fold3.")
        self.assertEqual(about["Training"], "1500 steps of Adam, then 4000 steps of L-BFGS. It started from random weights. Seed 1.")
        self.assertEqual(results.brief_run(data), "cutoffs 7 and 5 Å; 128 neurons; 2 trained, 1 held out")
        data["args"]["lbfgs_tol"] = 1e-07
        about = {line["label"]: line["text"] for line in results.describe_run(data)}
        self.assertTrue(about["Training"].startswith("1500 steps of Adam, then at most 4000 steps of L-BFGS (it stops earlier when the loss changes by less than 1e-07)."))
        warm = results.describe_run({"args": {"epochs": 10, "init": "runs/base_v1.pt", "rescale": True}, "rows": [{"src": "A", "test": False}]})
        self.assertIn("No structure was held out", warm[0]["text"])
        self.assertIn("started from the model base_v1, with the descriptor scale recomputed", warm[1]["text"])
        self.assertEqual(results.describe_run({}), [])
        self.assertTrue(all(r["about"] and "brief" in r for r in results.potential_runs([self.root])))

    def test_run_detail(self):
        run = results.potential_run([self.root], "good")
        self.assertEqual(len(run["curve"]), 3)
        self.assertEqual(run["rows"][0]["role"], "test")
        self.assertIsNone(results.potential_run([self.root], "missing"))
        self.assertIsNone(results.potential_run([self.root], "../good"))


if __name__ == "__main__":
    unittest.main()

# Prompt: Command Room — a desktop program for my thermal-conductivity and NEP work

Build a PC program that is the one place where I run my research: I prepare calculations in it, send them to the
cluster, watch them, read the results, get them explained, get a PDF report, and am told what to do next. It
replaces what I use today: a terminal on the cluster, my `hipipe` scripts, a work board on claude.ai, chats and
loose PDFs.

## What I do

I compute lattice thermal conductivity from first principles, material by material, in three stages:

1. **VASP:** DFT forces on supercells with random displacements (4×4×4 supercell, 5 rattled structures with
   amplitude 0.02 as my usual start). Polar materials also need a separate calculation of the Born charges.
2. **Training:** fit of the force constants (2nd, 3rd and 4th order) with hiPhive. Cutoffs are chosen by
   neighbour shell; the fit method is `rfe`, `least-squares`, or both.
3. **ShengBTE:** thermal conductivity from those force constants.

Next to it, I train NEP potentials with TorchNEP (PyTorch) and use them as a cheaper source of the forces for the
same three stages, then compare the result against the DFT one (for example "Si" against "SiTorch"). Comparing
two runs — DFT against NEP, `rfe` against `least-squares` — is how I judge everything.

Materials so far: Si, C (diamond), CoSb3, MgO and PbTe. MgO and PbTe are polar.

## My setup

- **One cluster with a PBS-style queue** (`qsub`, `qstat -u`, `qdel`), reached by SSH. On it, a conda environment
  called `hiphive`. Find the exact scheduler and the versions of VASP, hiPhive, ShengBTE, TorchNEP and PyTorch on
  the first connection instead of asking me.
- **Folders:** one per material: `<data>/<MATERIAL>/all/DFT/HiPhive2` holds POSCAR, SPOSCAR, INCAR, KPOINTS,
  POTCAR, `hipipe.cfg`, `CALC/job-01…` (and `CALC_LR` for polar materials), `train.job`, the fit results in
  `DIR_*` and the logs `post*.out`; ShengBTE runs go in `<data>/<MATERIAL>/all/ShengBTE`; shared tools in
  `<data>/tools`.
- **My own tools, which the program drives and does not replace:**
  - `hipipe.py` with `init` (supercell, `hipipe.cfg`, scell and ngrid), `pre` (displaced structures), `vasp`
    (submit the DFT jobs), `check` (must say "all good"), `shells` (cutoffs by distance), `fit` (writes and
    submits `train.job`), `bte` (plans and submits ShengBTE) and `compare` (two runs against each other). Every
    command takes `--dry-run`; the ones that send jobs only do so with `--submit`.
  - `hiPhive_wrapper_NML.py`, used with `--lr` for polar materials.
  - `bte_all.py`, which plans and submits ShengBTE for every material that is ready.
  - `hipipe.cfg` holds `vasp_cmd`, `shengbte_cmd`, `methods` and `polar`.
- **My work board on claude.ai**, the artifact "Tablero de trabajo": every material in each of the three stages
  as Faltan / Enviado / Terminado, a "what to launch now, per material" list, and a step-by-step guide with the
  exact commands. Read the artifact and its database: the host name, my user name and the data paths are in its
  guide, and the current state of each material is in its items. Import both into the program on first run.
- **My computer:** ask me which system it is; build installers for Windows and Linux.
- **A `history/` folder I will upload to the session:** the source of the tools above, a real `hipipe.cfg` and
  `train.job`, and the PDFs with results and explanations from my earlier chats.
- **My account skills** `vasp-calculations`, `nep-potential-training` and `pytorch-scientific-ml`, with their
  `references/` and `scripts/`.

This repository is public. The host name, my user name, the cluster paths, everything in `history/` and every
result of mine stay out of it; they live only in the program's local settings and data folder.

## Where the content comes from

Do not write the science from memory; turn these into data the program uses, and keep the source of each rule and
explanation so the program can show it.

- The board's guide and my tools give the workflow, the commands and my rules (below).
- The three skills give the VASP starting points and run checks, the error table, the rules for DFT training
  data, the NEP training, judging and active-learning loop, and the PyTorch checks.
- This repository gives the real `nep.in` parser (validate what the program writes with it) and `NEPPlotter`
  (dashboard, loss, parity, per-element periodic table) for the NEP figures.
- The PDFs in `history/` show what a finished result and its explanation look like for me. The program's reports
  follow their layout, and what they explain goes into the Library.
- For hiPhive and ShengBTE there is no skill: use the official documentation and my tools.

## The room

One window, dense but ordered, usable all day: a left rail with the areas below, a command bar on top, and a dock
on the right for the assistant and for details of whatever is selected. Interface in English and Spanish (Spain),
switchable.

- **Mission control (home).** What is happening now and what needs me: the queue with time left, live curves of
  trainings in progress, jobs that failed with the diagnosed cause, the "what to launch now" list per material,
  and the latest results.
- **Board.** My work board, grown up: materials as rows, the three stages as columns (plus the NEP branch where
  a material has one), each cell Faltan / Enviado / Terminado. The state is read from the cluster (the queue,
  `hipipe.py check`, the result files) instead of ticked by hand, with a manual override. Variants such as
  "C rfe", "C ls" and "SiTorch" are runs of the same material, not separate materials.
- **Material.** Everything about one material: structure and settings, the runs of each stage with their
  variants, the files, the results, and the comparisons. Files stay on the cluster; the program indexes them and
  fetches summaries, it does not copy my data around.
- **Jobs.** The queue in one table (state, elapsed and limit, material, stage, variant), a live tail of the
  output, a view that fits the job (electronic steps for VASP, fit progress, ShengBTE iterations, loss curves for
  NEP training), cancel and resubmit, and a notification when a job ends.
- **Launch.** Each step of the guide as a form instead of a command to remember: the form shows the `hipipe`
  command it will run, runs it with `--dry-run` first and shows what it would do, and only then offers to submit.
  It also edits `hipipe.cfg`, writes INCAR and KPOINTS with a reason next to each line, writes `nep.in` and the
  training script, and keeps earlier versions of everything it wrote. "Everything that is ready, at once" uses
  `bte_all.py` in the same way: plan first, then submit.
- **Results.** Interactive viewers (zoom, values under the cursor, export as image and as data): VASP run checks;
  quality of the force-constant fit by method and cutoff; phonon dispersion and DOS; κ against temperature with
  its tensor, cumulative κ against mean free path, scattering rates, convergence with the grid; NEP loss, parity
  plots and outliers. Any two runs side by side, with the output of `hipipe.py compare`.
- **Elements.** An interactive periodic table. For each element: basic data (mass, radii, configuration), the
  POTCAR title and ENMAX found in my material folders, notes that matter for setup (magnetic, usually needs +U,
  forms polar compounds), and what I have for it: materials, training frames, and the per-element force error of
  each NEP model. The table can be coloured by any of these.
- **Library.** The guide from my board, the explanations from my PDFs, and one page per concept, tag and keyword
  the program uses (smearing, Born charges and the non-analytic correction, cluster expansion of force constants,
  `rfe` against least squares, RTA and the full solution, the NEP descriptor, extrapolation grade…), searchable.
  Wherever a term appears in the program, one click opens its explanation.
- **Reports.** A PDF for a run, a comparison or a whole material, in the layout of my earlier PDFs: what was
  computed and with which settings, the checks and whether they passed, the figures, an explanation in plain
  words, what was not checked, and the next steps.

## Sending things easily

- **Drop anything anywhere.** The program recognises POSCAR, INCAR, OUTCAR, vasprun.xml, `hipipe.cfg`,
  `train.job`, force-constant files, ShengBTE output, `nep.in`, `loss.out`, `train.xyz`, `nep.txt` or a PDF, and
  offers what makes sense: check it, plot it, attach it to a material, launch the next step from it, explain it.
- **Command bar (Ctrl+K).** Go anywhere, find any run, and write requests in plain words ("launch training for
  PbTe with rfe", "why did the MgO fit fail", "report comparing Si and SiTorch"). A request becomes a prepared
  action shown for review, never something that runs by itself.
- **Before anything is sent** the program shows the exact command, the dry-run output and where it will run, and
  waits for me. It never deletes or overwrites anything on the cluster.

## What to do next

Recommendations come first from fixed rules, not from a language model, so they are the same every time and can
be tested. Each one shows the evidence (file and value), the reason, and a button that opens the prepared step.

- **My rules, from the board:** a stage is offered only when the one before it is finished. Polar materials
  (MgO, PbTe, and any new one the program detects as polar) use `--lr` in `pre` and in the fit, their Born-charge
  calculation is sent too, and `polar = yes` is set before ShengBTE. `hipipe.py check` must say "all good"
  before training. For Si the cutoffs are `--c3 7.05 --c4 4.48`. The first number of `FORCE_CONSTANTS_3RD` must
  be greater than 0 before ShengBTE. When two variants of a material are finished, offer the comparison.
- **From the skills:** a relaxation that reached NSW without "reached required accuracy" → restart from CONTCAR;
  entropy term above 1 meV/atom → lower SIGMA; frames computed with different DFT settings in one dataset → stop
  and recompute; validation loss rising while training falls → more data; MD frames with extrapolation grade
  above 1 → select them for DFT; a NEP judged only by RMSE → say so and propose the physical tests.
- **For the thermal-conductivity chain, from the documentation:** fit error still falling with more structures →
  add structures; imaginary modes → check the relaxation and the supercell; κ changing with the grid → next grid;
  NEP and DFT κ disagreeing → show where (dispersion, scattering rates, which modes) rather than only the total.

**The assistant** (Claude, through my own API key kept in the system keychain) answers questions about the
selected run or material, writes and edits scripts, and explains results. It works with the real files and the
Library, says which file or source each statement comes from, and goes through the same review step as
everything else. The program is fully usable without it.

## What makes it trustworthy

- No invented numbers anywhere. A screen with no data says so. The one bundled example is labelled as an example
  on every screen where it appears.
- Every number carries its unit, and stresses and virials carry their sign convention, because VASP, ASE and
  GPUMD differ.
- POTCAR contents are never copied, stored or shown beyond the title and ENMAX: the files are licensed.
- Input syntax depends on the version of each code. The program knows the installed versions and checks what it
  writes against the documentation of that version; when it cannot be sure, it says so next to the line.
- Logins use my existing SSH configuration and agent. No password or key is stored by the program.

## How it should look

A control room, not an office dashboard: dark by default (with a light theme), calm background, numbers, commands
and file contents in a monospaced face, colour reserved for state (to do, sent, done, failed, needs attention) so
that a red thing always means something, and a few live elements that make it feel switched on: the queue, the
curves of running jobs, the board filling in. A lot of information per screen, arranged so that the eye finds the
state first, then the numbers, then the detail. Fully usable from the keyboard. Use the `frontend-design` and
`dataviz` skills, and show me two visual directions with a real screen each before building the rest.

## How to build it

- A local program with one installer, in a new top-level folder `command-room/`, released from GitHub Actions
  like the other apps in this repository. Suggested shape: a Python core (SSH, the queue, running my tools,
  parsing with ASE, pymatgen, phonopy, hiPhive and TorchNEP, the rules, the PDF reports) behind a local API, a
  web interface in a native window, and a small local database that indexes materials, runs and jobs. Choose the
  packaging that gives a reliable installer and tell me what you chose and why.
- Where the program needs something my tools do not give (a machine-readable status, a missing option), propose
  the change to the tool and show it to me; do not copy their logic into the program.
- Large files (OUTCAR, `train.xyz`, trajectories) are read in a stream and in the background, and summarised on
  the cluster instead of downloaded; the interface never freezes.
- Tests with real files, not made-up ones: `tests/data` of this repository, public VASP, hiPhive and ShengBTE
  examples, and the files in `history/` (used locally, never committed). Every parser is checked against known
  values, every rule has a case that triggers it and one that does not, and the whole path (launch → queue →
  result → comparison → report) runs in CI against stand-in `qsub`, `qstat` and `qdel` and a copy of my folder
  layout. Take screenshots of every screen in CI.

## Order of work

1. Read the board and its database, the skills, this repository and `history/`. Ask me which system my computer
   runs and anything those sources leave open, in one message. Write a short plan with the list of screens and
   the two visual directions, and wait for my choice of direction only.
2. The core without the interface: connection, queue, my tools with dry-run, parsers, checks and rules, tested.
3. The room: home, board, material, results, elements, library, on the imported board and the example.
4. Launch and jobs against the real cluster, with the review step.
5. Reports in the layout of my PDFs, comparisons, the assistant.
6. Installers, README with screenshots, a release.

At the end tell me plainly what was run on the real cluster, what was only tested against the stand-in queue, and
what you could not verify.

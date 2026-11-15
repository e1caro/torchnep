# Prompt: Command Room — a desktop program for my computational-materials work

Build a PC program that is the one place where I run my research: I prepare calculations in it, send them to the
cluster, watch them, read the results, get them explained, get a PDF report, and am told what to do next. It
replaces the mix of terminals, loose scripts, chats and PDFs I use today.

## My setup (anything still in brackets: ask me once at the start, then go on)

- My computer: [Windows 11 / Linux / macOS]
- Cluster(s) and scheduler: [name, SLURM or other, how I log in]
- Where my POTCAR library is: [path on the cluster]
- Codes and versions I use: [VASP 5 or 6, hiPhive, ShengBTE or FourPhonon, GPUMD, TorchNEP, PyTorch]
- Materials I am working on now: [systems]
- "ClaudeHub" means: [what it is and where its running jobs can be read]

## Who this is for and what the work is

I am a computational materials researcher. My work is two chains that share the same DFT data:

1. **Thermal transport from force constants:** structure → VASP (relaxation, convergence, forces on displaced or
   rattled supercells) → hiPhive (cluster space, fit of 2nd and 3rd order force constants, validation) → phonon
   dispersion → ShengBTE (CONTROL, q-grid convergence, κ(T), cumulative κ, scattering rates).
2. **Machine-learned potentials:** VASP single points → `train.xyz` → TorchNEP training in PyTorch → validation →
   GPUMD molecular dynamics → active learning (frames the model extrapolates on go back to DFT) → retrain.

Each number at the end depends on every step before it, so the program is organised around that chain, and every
result can be traced back to the inputs that produced it.

## Read these first; they are the content of the program

- **My account skills** `vasp-calculations`, `nep-potential-training` and `pytorch-scientific-ml`, with their
  `references/` and `scripts/` (`check_run.py`, `vasp_to_extxyz.py`, `errors.md`, the training-data rules, the
  active-learning and multi-GPU notes). Their starting points, checks, symptom tables and reporting rules are the
  source of the program's wizards, checks, recommendations and explanations. Do not rewrite that knowledge from
  memory; turn it into data the program uses.
- **This repository:** the `torchnep/` package and `docs/`. Use the real `nep.in` parser to validate what the
  program writes, and `NEPPlotter` (dashboard, loss, parity, per-element periodic table) for the NEP figures.
- **A `history/` folder I will upload to the session:** my earlier PDFs, scripts, inputs and exported chats. They
  show what a finished result looks like for me and what was already decided. Reports must look like those PDFs,
  and the explanations and recommendations must include what those documents say. There is no hiPhive or ShengBTE
  skill yet: write those rules from the official documentation and from my history, and keep the source of each.
- This repository is public. Nothing from `history/`, and no hostname, user name, cluster path or result of mine,
  may be committed. They live only in the program's local settings and data folder.

## The room

One window, dense but ordered, usable all day. A left rail with the areas below, a command bar on top, and a dock
on the right for the assistant and for details of whatever is selected.

- **Mission control (home).** What is happening now and what needs me: jobs running and queued with time left,
  live curves of the trainings in progress, runs that failed with the diagnosed cause, the next recommended steps
  per project, and the latest results. Readable from across the room.
- **Projects.** One project per material or question. Each shows its pipeline as a map of steps (relax, converge,
  supercells, force constants, phonons, κ; or data, train, validate, MD, active learning) with the state of each
  step, and opens the runs behind it. Files stay where they are, on my disk or on the cluster: the program
  indexes them, it does not move or copy my data around.
- **Jobs.** The queue of every cluster in one table (state, elapsed and limit, nodes, project and step), a live
  tail of the output, a convergence view that fits the job (electronic and ionic steps for VASP, loss curves for
  training, thermo for MD), cancel, resubmit and restart (from CONTCAR or from the checkpoint), and a notification
  when a job ends. The running jobs from ClaudeHub appear in the same table with their own label.
- **Build.** Guided builders that write the files and the code, each line with its reason next to it:
  VASP (INCAR, KPOINTS or KSPACING, job script, by kind of system and task, plus series for convergence tests);
  hiPhive (script for the training structures, cluster space and cutoffs, fit with cross-validation, force
  constants written for phonopy and ShengBTE); ShengBTE (CONTROL from the primitive cell, grids, temperatures,
  convergence series); TorchNEP (`nep.in`, training script, multi-GPU SLURM script); GPUMD (`run.in`); conversion
  of VASP output to extended XYZ. Everything generated opens in an editor, is saved in the project and keeps its
  earlier versions.
- **Results.** A viewer per kind of result, interactive (zoom, values under the cursor, export as image and as
  data): VASP run checks and convergence; force-constant fit quality against cutoffs and number of structures;
  phonon dispersion and DOS; κ(T) with its tensor, cumulative κ against mean free path, scattering rates,
  convergence against the grid; NEP loss, parity plots and outliers; MD thermo. Any two runs can be put side by
  side.
- **Elements.** An interactive periodic table. For each element: the basic data (mass, radii, configuration), the
  POTCAR variants in my library with their ENMAX (read from my own files), notes that matter for setup (magnetic,
  usually needs +U, needs semicore states), and what I have for it: projects, number of training frames, and the
  per-element force error of each model. The table can be coloured by any of these.
- **Library.** Explanations of the concepts and of every tag and keyword the program writes (smearing, Pulay
  stress, cluster expansion of force constants, RTA and the full solution, the NEP descriptor, extrapolation
  grade…), searchable. Wherever a term appears in the program, one click opens its explanation.
- **Reports.** A PDF for a run, a comparison or a whole project, in the layout of my earlier PDFs: what was
  computed and with which settings, the checks and whether they passed, the figures, an explanation in plain
  words, what was not checked, and the next steps.

## Sending things easily

- **Drop anything anywhere.** The program recognises POSCAR, INCAR, OUTCAR, vasprun.xml, OSZICAR, `nep.in`,
  `loss.out`, `train.xyz`, `nep.txt`, CONTROL, force-constant files, ShengBTE output, a job script or a PDF, and
  offers what makes sense: check this run, plot it, add it to a project, build the next step from it, explain it.
- **Command bar (Ctrl+K).** Go anywhere, find any run, and write requests in plain words ("relax this cell with
  ENCUT 520 on 2 nodes", "why did job 48213 fail", "report for the Si κ convergence"). A request becomes a
  prepared action shown for review, never something that runs by itself.
- **Before anything leaves my computer** the program shows the exact files, the exact command and where it will
  run, and waits for me. It never deletes or overwrites anything on the cluster.

## Recommendations, explanations and the assistant

- **What to do next** comes first from fixed rules, not from a language model, so that it is the same every time
  and can be tested. Examples: a relaxation that reached NSW without "reached required accuracy" → restart from
  CONTCAR; entropy term above 1 meV/atom → lower SIGMA; an ISIF = 3 result with no final static run → run it;
  force-constant cross-validation error still falling with more structures → add structures; imaginary modes →
  check the relaxation and the supercell; κ changing with the grid → next grid; validation loss rising while
  training falls → more data; MD frames with extrapolation grade above 1 → select them for DFT; mixed DFT settings
  inside one dataset → stop and recompute. Each recommendation shows the evidence (file and value), the reason,
  and a button that prepares the next step.
- **The assistant** (Claude, through my own API key kept in the system keychain) answers questions about the
  selected run or project, writes and edits scripts, and explains results. It works with the project's real files
  and the Library, says which file or source each statement comes from, and goes through the same review step as
  everything else. The program is fully usable without it and without internet.

## What makes it trustworthy

- No invented numbers anywhere. A screen with no data says so. The one bundled example project is labelled as an
  example on every screen where it appears.
- Every number carries its unit, and stresses and virials carry their sign convention, because VASP, ASE and
  GPUMD differ.
- POTCAR contents are never written, stored or shown beyond the title and ENMAX: the files are licensed. The
  program says which ones to concatenate and in what order, and builds them on the cluster from my own library.
- Input syntax depends on the version (VASP 5 and 6, GPUMD, ShengBTE, hiPhive, TorchNEP, PyTorch). The program
  knows the versions from my setup and checks what it writes against the documentation of that version; when it
  cannot be sure, it says so next to the line.
- Logins use my existing SSH configuration and agent. No password or key is stored by the program.

## How it should look

A control room, not an office dashboard: dark by default (with a light theme), calm background, numbers and file
contents in a monospaced face, colour reserved for state (running, done, failed, needs attention) so that a red
thing always means something, and a few live elements that make it feel switched on: the queue, the curves of
running jobs, the pipeline map filling in. A lot of information per screen, arranged so that the eye finds the
state first, then the numbers, then the detail. Fully usable from the keyboard. Use the `frontend-design` and
`dataviz` skills, and show me two visual directions with a real screen each before building the rest.

## How to build it

- A local program with one installer for my system, in a new top-level folder `command-room/`, released from
  GitHub Actions like the other apps in this repository. Suggested shape: a Python core (parsing and science
  with ASE, pymatgen, phonopy, hiPhive and TorchNEP; SSH; the rules; the PDF reports) behind a local API, a web
  interface in a native window, and a small local database that indexes projects, runs and jobs. Choose the
  packaging that gives a reliable installer and tell me what you chose and why.
- Large files (OUTCAR, `train.xyz`, trajectories) are read in a stream and in the background; the interface never
  freezes. For files on the cluster, read summaries there instead of downloading everything.
- Tests with real files, not made-up ones: the fixtures in `tests/data` of this repository, public VASP examples,
  and the public hiPhive and ShengBTE examples. Every parser is checked against known values, every
  recommendation rule has a case that triggers it and a case that does not, and the whole path (build → submit →
  watch → result → report) runs in CI against a stand-in scheduler. Take screenshots of every screen in CI.

## Order of work

1. Read the skills, this repository and `history/`; ask me the open points of "My setup"; write a short plan with
   the list of screens and the two visual directions. Wait for my choice of direction only.
2. The core without the interface: project index, parsers and checks for the five codes, the rules, with tests.
3. The room: home, projects, results, elements, library, on the example project and on files I drop.
4. The cluster: connection, jobs table, live views, submit and restart with the review step.
5. Builders, reports in the layout of my PDFs, the assistant.
6. Installer, README with screenshots, a release.

At the end tell me plainly what works on a real cluster, what was only tested against the stand-in scheduler, and
what you could not verify.

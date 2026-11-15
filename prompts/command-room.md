# Prompt: Command Room — a desktop program for my thermal-conductivity and potential work

Build a PC program that is the one place where I run my research: I prepare calculations in it, send them to the
clusters, watch them, read the results, get them explained, get a PDF report, and am told what to do next. It
brings together what I use today: a terminal on the cluster, my `hipipe` scripts, the scripts that send jobs to
two clusters, a local work board ("Tablero de trabajo"), ClaudeHub (my local index and job monitor), chats and
loose PDFs.

This work has to be done on my own computer, because everything the program builds on is there. The private
facts (host names, my user names, cluster paths, where the tools, config files, PDFs and chat transcripts are,
what ClaudeHub is and where) are in `command-room.local.md` at the root of this repository. That file is
git-ignored and exists only on my computer. Read it first. If it is missing, stop and ask me.

## What I do

I compute lattice thermal conductivity from first principles, material by material, in three stages:

1. **VASP:** DFT forces on supercells with random displacements. My usual start is a 4×4×4 supercell (512 atoms
   for an 8-atom cell) and rattled structures with amplitude 0.02 Å: 5 structures for Si and C, 10 for CoSb3.
   Polar materials also need a separate calculation of the Born charges and the dielectric constant.
2. **Training:** fit of the force constants of 2nd, 3rd and 4th order with hiPhive, through a wrapper script.
   ShengBTE only uses the 2nd and 3rd order; the 4th is fitted with them because it improves them. Cutoffs are
   chosen by neighbour shell and compared between materials by distance, never by shell number. The fit method
   is `rfe`, `least-squares`, or both; with few structures `rfe` is the safe one, because least squares
   overfits.
3. **ShengBTE:** thermal conductivity from those force constants.

Next to it, I use machine-learning potentials as a cheaper source of the forces for the same three stages, and
compare the result against the DFT one. There are two kinds so far:

- a ready NEP model (GPUMD format) for Si, evaluated on the CPU with calorine by my script `nep2vasp.py`;
- my own NEP-style potentials written in PyTorch (Chebyshev radial and Legendre angular descriptors, one small
  network per atom, forces by autograd), trained on this computer's GPU with my own harness and evaluated on the
  cluster CPU by `torch2vasp.py`. There are models for Si and for C.

Both scripts write VASP-style `OUTCAR` and `vasprun.xml`, so the rest of the chain does not change. My files and
chats show no run trained with TorchNEP (the package in this repository) or with GPUMD, and GPUMD is not built
on any machine I use: ask me before building screens for them, and keep the design open for them.

Comparing two runs is how I judge everything: DFT against a potential, `rfe` against `least-squares`. A
comparison is only fair when just one thing changes, so the two runs use the same structures (generated once and
copied), the same cutoffs, number of structures, fit method and q-mesh. The reference always goes first.

Materials so far: Si, C (diamond), CoSb3, MgO and PbTe. MgO and PbTe are polar. Runs of the same material are
told apart by the source of the forces (DFT, NEP, or a torch model) and by the fit method (`rfe`, `ls`). On my
board they appear as names such as "C rfe", "C ls", "SiTorch" and "torch V2".

To get DFT data for the potentials I also make and compute other sets: rattled structures picked from molecular
dynamics with an existing model or made with random displacements (20 or 30 structures of 512 atoms, spread over
the force range) and structures chosen where a committee of models disagrees. There is also a larger MgO set (MD
and elastic deformations) computed on the second cluster; ask me what it is for.

## My setup

- **This computer:** Windows 11 Pro, 64-bit (x64), one 8 GB NVIDIA GPU. WSL2 with Ubuntu 22.04 is installed and
  is where the PyTorch trainings run (it allows `torch.compile`); Git Bash runs my sender scripts. The plain
  `python` command is a Store stub, so the program must bring its own Python and not rely on mine. Build the
  installer for Windows x64 only.
- **Two clusters, both reached by SSH** (no AI agent runs on them; the second also needs my registered IP to be
  active):
  - *The Torque cluster* (university, CPU only, 24-core nodes, some with more memory). Torque/PBS: `qsub`,
    `qstat -u`, `qdel`, which are in a folder that is not on the PATH by default. Job scripts start with `#PBS
    -V`, `-N` (15 characters at most), `-r n`, `-j oe`, `-o <log>`, `-l nodes=<n>:<property>:ppn=24`, `-m e`,
    then `cd "$PBS_O_WORKDIR"`. Fits load conda and `conda activate hiphive`. VASP 6.3.2 and ShengBTE 1.5 are
    loaded as modules. ShengBTE is not on the PATH: my working job script uses a login shell, four big-memory
    nodes, a site command that prepares the executable, and one MPI rank per node. The hiPhive fits, the
    ShengBTE runs and normally the VASP runs of the displaced structures are done here.
  - *The Slurm cluster* (a larger supercomputer: 56 cores per node, at most 4 nodes per job, work in scratch). I
    use it for the large DFT sets. Jobs go there in packs from this computer with my sender script. After a
    crash that killed every calculation, the launch that works is fixed: `module purge`, the site's MPI and BLAS
    modules, the vendor environment script (mandatory), `--export=NONE` and `srun --mpi=pmix`. VASP is chosen
    per folder: `vasp_ncl` with LSORBIT or LEPSILON, `vasp_gam` with a 1×1×1 KPOINTS, else `vasp_std`.
- **Versions.** Known from my files: VASP 6.3.2 and ShengBTE 1.5 on the Torque cluster; PyTorch 2.11 (CUDA
  build) and Python 3.14 on this computer; Python 3.10 in WSL. Not shown anywhere, so check them on the first
  connection instead of asking me: hiPhive and trainstation, Python, calorine and PyTorch in the cluster's
  `hiphive` environment, and VASP on the Slurm cluster.
- **Folders on the Torque cluster.** One folder per material: `<data>/<Material>/all/<SOURCE>/HiPhive*/`, where
  SOURCE is `DFT`, `NEP` or a torch label. A calculation folder holds `POSCAR` (unit cell), `SPOSCAR`,
  `INFILES/` (INCAR, KPOINTS, POTCAR of one single-point run), a copy of the wrapper, `hipipe.cfg`,
  `shells.dat`, `pre.out`, `histogram.dat`, `CALC/job-01…` (one displaced structure each, with its VASP output),
  `train.job`, `train.log`, the fit log `post<k3>_<k4>.out` and one result folder per fit,
  `DIR_cutoff_<c2>_<c3>_<c4>_n_<N>_<method>_tf_<fraction>`, with `FORCE_CONSTANTS_2ND`, `FORCE_CONSTANTS_3RD`,
  `CONTROL` and `Potential.fcp`. Polar materials add `INFILES_LR`, `CALC_LR`, `BORN` and result folders named
  `DIR_LR_cutoff_…`. ShengBTE runs are in `<data>/<Material>/all/ShengBTE/<SOURCE>_<rfe|ls>` with `BTE.omega`,
  `BTE.v`, `BTE.qpoints`, `BTE.KappaTensorVsT_RTA`, `BTE.KappaTensorVsT_CONV` and `T<temp>K/BTE.w_anharmonic`.
  Shared tools and model files are in `<data>/tools`. An older Si tree does not follow this layout (calculation
  folders directly under the material, torch runs with their own `ShengBTE` subfolder, reference runs named
  after the q-mesh), so the program indexes what exists instead of assuming one layout.
- **Folders on this computer.** The potentials live here, not on the cluster: the DFT data sets of Si and C, the
  training harness (`data.py`, `model.py`, `exp.py`; every run writes `runs/NAME.pt`, `.log` and `.json`), a
  findings log, the scripts that build my PDF reports, the sender scripts, the board, ClaudeHub and a guide of
  every command.
- **My own tools, which the program drives and does not replace.** Take their exact behaviour from the source,
  which is on this computer except for the wrapper:
  - `hipipe.py COMMAND`, run in the calculation folder as `python <tools>/hipipe.py …` (there is no alias; a
    shell helper copies the tools into the current folder). Every command takes `--cfg FILE` and `--dry-run`,
    which prints the commands without running them. Jobs are only sent with `--submit`.
    - `init --dim X Y Z --label NAME [--force]`: writes `hipipe.cfg`, makes `SPOSCAR` if missing, finds `scell`
      and proposes `ngrid` (a starting guess only).
    - `shells [--c3 Å] [--c4 Å] [--write]`: runs the wrapper in shell mode, saves `shells.dat`, prints the table
      of shells with the orders that use each one and the line `cutoffs: MAX -k3 -k4`.
    - `pre --n N`: makes `INFILES` if needed and runs the wrapper in pre mode to create `CALC/job-XX`.
    - `vasp [--submit] [--force]`: writes `run_vasp.job` in every job folder from `vasp_cmd`; finished jobs are
      skipped.
    - `forces --source nep|torch`: computes the forces of every job with a potential instead of VASP.
    - `check`: counts job folders, finished OUTCARs and `vasprun.xml`, compares the atoms with `SPOSCAR`, lists
      problems (unfinished job, missing file, a stray folder inside `CALC`, `n` not matching) and exits with an
      error, or prints `all good`.
    - `fit [--submit]`: writes `train.job` with the wrapper's post command (methods, cutoffs, n, train fraction,
      `--ngrid`, `--scell`, `--temp`) and prints that command.
    - `bte [--out DIR] [--only TEXT] [--submit] [--force]`: for every `DIR_*` makes `<out>/<LABEL>_<method>`
      with the force constants and a corrected `CONTROL` (ngrid, scell, T, scalebroad, and `nonanalytic` for
      polar), prints the number of third-order blocks, warns and does not submit when it is 0, and writes the
      job as a copy of my working ShengBTE script with only the name changed.
    - `compare --ref DIR --test DIR [--fc-ref DIR] [--fc-test DIR] [--out PREFIX] [--temp T] [--ref-name A]
      [--test-name B]`: runs the five compare scripts between two ShengBTE run folders.
  - `hipipe.cfg`, one section `[run]`: `label`, `poscar`, `sposcar`, `wrapper`, `rattle` (`rattle`, `mc` or
    `phon-rat`), `n` (a number or `auto` = finished jobs), `amp`, `temp`, `tf`, `methods`, `cutoffs` (`auto` or
    for example `MAX -5 -1`), `c3_target`, `c4_target`, `ngrid`, `scell`, `scalebroad`, `polar`, `queue_nodes`,
    `ppn`, `walltime`, `conda_sh`, `conda_env`, `vasp_pre`, `vasp_cmd`, `shengbte_cmd`, `bte_template`,
    `nep_file`, `torch_model`. In my real files `vasp_cmd` and `shengbte_cmd` are empty: ShengBTE goes through
    `bte_template`, and I send VASP with my own job scripts. Ask me which VASP job script to adopt before
    offering `hipipe vasp`.
  - `hiPhive_wrapper_NML.py` (its source is only on the cluster; my chats hold its option list). Modes `-m pre |
    post | shell | control | scph | ehm | debug`; `-p`, `-s`, `-i`; `-r` rattle mode, `-n` structures, `-a`
    amplitude; `-c` cutoffs (a distance in Å, `MAX` for the largest the supercell allows, or 0 and negative
    integers for shells: `-k` means just below shell k+1); `-f` list of fit methods; `-t` train fraction;
    `--temp`, `--ngrid`, `--scell`, `--scaleb` for `CONTROL`; `--lr` for polar materials; `--rot_sumrule`; `-b`
    for a size-convergence test; and options for the `scph` and `ehm` modes, which do not appear in my chats. It
    reads `./CALC`, treats every folder in it as a job, stops if one OUTCAR is unfinished, refuses to run when
    the result folder already exists, and writes `CONTROL` with `ngrid` and `scell` 1 1 1 and
    `nonanalytic=.FALSE.` unless told otherwise.
  - `bte_all.py`: looks through every material for fitted force constants without a ShengBTE run and prints a
    plan with one of `launch`, `done`, `prepared`, `skip` (with the reason) for each. It only creates folders
    and submits with `--submit`. Options: `--root`, `--only`, `--redo`, `--template`, `--polar`, `--ngrid
    MAT=A,B,C`, `--nodes`, `--ppn`, `--prop`, `--walltime`.
  - `bte_summary.py`: one table of every ShengBTE run that has results: κ at a temperature (RTA and converged),
    κ over the literature value, difference to the DFT `rfe` run of the same material, ngrid, scell, q-points,
    third-order blocks, highest and lowest frequency, mean group velocity, mean scattering rate, the fit's
    training and validation RMSE, and the count of null force constants.
  - The compare tool is five separate scripts that `hipipe.py compare` runs: `compare_fc2.py`, `compare_fc3.py`,
    `compare_omega.py`, `compare_v.py` and `compare_w_anharmonic.py`. Each takes the reference first, drops a
    value only when the reference is below 1e-5 (third-order blocks are matched by their header, never by block
    number), draws a parity plot with (a) linear and (b) logarithmic axes coloured by weight, writes PNG and PDF
    and prints the RMSE. The last three need the same q-mesh in both runs. `fc_between.py` lists force constants
    in a range.
  - `nep2vasp.py` and `torch2vasp.py` (a matching pair: keep them at the same version), the sender scripts for
    the two clusters (upload, one job script per calculation or per pack, `--dry-run`, status, collect, and a
    checker that classifies every folder as OK, FAILED, NOT RUN, INCOMPLETE or INCONSISTENT), small watchers
    that mirror cluster jobs into ClaudeHub, and the training harness with its report scripts.
- **My work board, "Tablero de trabajo"**, is a local program on this computer, not the claude.ai artifact of
  the same name (that one is old and out of date; do not read it). It keeps every material in each of the three
  stages as `faltan`, `enviado` or `terminado`, with a history, a "what to launch now" list and a guide with the
  commands. Read its data file; change it only through its own command line (`tablero.py set STAGE NAME STATE`,
  also `add`, `borrar`, `nota`), so its checks and history stay valid.
- **ClaudeHub** is also a local program on this computer: an index (SQLite with full-text search) of my Claude
  sessions, memory notes, findings, run results and the board; a window with projects, jobs, runs, search,
  decisions and the board; and tools that Claude sessions use to ask it short questions. Its job monitor is what
  matters here: any script reports progress through `jobtrack.py`, which writes one small JSON file per job
  (name, project, step, total, metric, phase, state `running`, `done` or `failed`, start and update times,
  machine, command). My trainings report this way, and the watchers do the same for cluster jobs.
- **A guide of every command and script I have** (a catalogue file and the PDF built from it), which I keep
  complete: every new command is added to it.
- **My account skills** `vasp-calculations`, `nep-potential-training` and `pytorch-scientific-ml`, with their
  `references/` and `scripts/`.

This repository is public. The host names, my user names, the cluster and local paths, the source of my tools,
my PDFs, my chats and every result of mine stay out of it; they live only in `command-room.local.md` and in the
program's local settings and data folder.

## Where the content comes from

Do not write the science from memory; turn these into data the program uses, and keep the source of each rule
and explanation so the program can show it.

- The source of my tools gives the commands, options, file names and checks. Where the board's guide and the
  source disagree, the source wins.
- My chat transcripts and memory notes (places in the local file) give what was decided and why, the problems
  met and their fixes. Search them by keyword and read only the sessions that match; they are large. Where two
  chats disagree, the most recent decision wins, and say so when it is unclear.
- The three skills give the VASP starting points and run checks, the error table, the rules for DFT training
  data, the training, judging and active-learning loop for potentials, and the PyTorch checks.
- This repository gives the `nep.in` parser and `NEPPlotter` (dashboard, loss, parity, per-element periodic
  table), for the day I train with TorchNEP.
- My PDFs (places in the local file) show what a finished result and its explanation look like for me. The
  program's reports follow their layout, described under Reports, and what they explain goes into the Library.
- For hiPhive and ShengBTE there is no skill: use the official documentation, my tools and my workflow PDF.

## The room

One window, dense but ordered, usable all day: a left rail with the areas below, a command bar on top, and a
dock on the right for the assistant and for details of whatever is selected. Interface in English and Spanish
(Spain), switchable.

- **Mission control (home).** What is happening now and what needs me: the queues of both clusters with time
  left, the jobs running on this computer, live curves of trainings in progress, jobs that failed with the
  diagnosed cause, the "what to launch now" list per material, and the latest results.
- **Board.** My work board, grown up: materials as rows, the three stages as columns, one row per variant
  (source of the forces and fit method), each cell `faltan` / `enviado` / `terminado`. It starts from the
  board's data file. The state is also read from the cluster (the queue, `hipipe.py check`, the result files),
  and where the board and the files disagree the program shows both and offers to update the board through
  `tablero.py`; it never changes it silently. Variants are runs of the same material, not separate materials.
- **Material.** Everything about one material: structure and settings, the runs of each stage with their
  variants, the files, the results, and the comparisons. Files stay on the cluster; the program indexes them and
  fetches summaries, it does not copy my data around.
- **Jobs.** One table for three sources: the Torque queue, the Slurm queue, and the jobs on this computer read
  from ClaudeHub's job files (read only). For each: state, elapsed and limit or step and total, material, stage,
  variant, latest metric, and a live tail of the output with a view that fits the job (electronic steps for
  VASP, fit progress, ShengBTE iterations, error curves for a training). Trainings run inside WSL, so they are
  not in the Windows process list, and their logs print rarely: a long silence is not a stall. Follow
  ClaudeHub's two rules: a job whose process died without a result is removed, and a finished or failed job
  disappears 5 minutes after it ended (keep it in the history). Everything long that Command Room itself runs
  reports through `jobtrack.py` too, one bar per parallel process, so it also shows in ClaudeHub. Cancel,
  resubmit, and a notification when a job ends.
- **Launch.** Each step as a form instead of a command to remember: the form shows the `hipipe` command it will
  run, runs it with `--dry-run` first and shows what it would do, and only then offers to submit. It also edits
  `hipipe.cfg`, writes INCAR and KPOINTS with a reason next to each line, prepares the packs for the Slurm
  cluster with the sender's own dry run, prepares a training of a potential as a queue of runs (one at a time:
  the GPU holds one large run), and keeps earlier versions of everything it wrote. "Everything that is ready, at
  once" uses `bte_all.py` in the same way: the plan first, then `--submit` with my template.
- **Results.** Interactive viewers (zoom, values under the cursor, export as image and as data): VASP run
  checks; quality of the force-constant fit by method and cutoff (training against validation RMSE); phonon
  dispersion and DOS; κ against temperature with its tensor, RTA and converged; cumulative κ against mean free
  path; scattering rates; convergence with the q-mesh; for potentials the error curve, parity plots against DFT,
  error per structure against the size of its forces, and outliers. Any two runs side by side with the five
  figures of `hipipe.py compare`, the `bte_summary.py` table, and κ of every run against temperature with its
  difference to the reference.
- **Elements.** An interactive periodic table. For each element: basic data (mass, radii, configuration), the
  POTCAR title and ENMAX found in my material folders, notes that matter for setup (magnetic, usually needs +U,
  forms polar compounds), and what I have for it: materials, training structures, and the force error of each
  potential. The table can be coloured by any of these.
- **Library.** The guide of my commands, the explanations from my PDFs (their glossaries are ready-made pages),
  one page per problem I have met with its fix, and one page per concept, tag and keyword the program uses
  (smearing, Born charges and the non-analytic correction, neighbour shells and cutoffs, cluster expansion of
  force constants, `rfe` against least squares, RTA and the full solution, the NEP descriptor and its cutoffs,
  training against held-out error, committee disagreement, extrapolation grade…), searchable. Wherever a term
  appears in the program, one click opens its explanation.
- **Reports.** A PDF for a run, a comparison or a whole material, built the way my own are (a script that draws
  every page with matplotlib and saves them into one PDF), A4 portrait, in English:
  - *A cover:* the name in very large bold type, one line saying what it is, two or three lines saying what is
    inside and the headline result with its definition, then project and date.
  - *Then one topic per page.* A dark band across the top with the page title on the left and a short subtitle
    on the right. Below it at most one figure, then a table with striped rows, then three to five short notes
    that say how to read it. About 100 to 250 words per page.
  - *The usual order for one model or run:* the idea from scratch (the goal, how we get it, the cost, the
    shortcut); how it was found (the result after each change, and which changes did nothing); how it works (a
    flow of boxes from atom positions to forces); the data and the settings; the results (a bar chart per data
    set, a table per run, and a note saying which number is the honest one); the path from the potential to
    thermal conductivity as numbered steps with the `hipipe` command of each; a glossary.
  - *A comparison of many runs:* one table of all of them (what each was trained or fitted on, its own test,
    data it never saw, time) with the reference and the recommended rows highlighted and the footnotes under it;
    a ranking; error against the size of the forces; the effect of one setting; parity plots in a grid of
    panels; a per-structure page; a last page "Findings and glossary".
  - *A scan of settings:* the first page is text: what was varied, how large the noise between seeds is (so
    which differences are real), and a "Recommendation" block naming the most accurate, the best for its cost,
    the cheapest within the noise, and the reference. Then the full table, error against time, a heat map over
    two settings with the value in each cell, and the error per test structure.
  - *An explainer or a guide* is a document instead: a title band; a row of four tiles "Result at a glance" (a
    large number with a caption under it); "What is in this report"; numbered sections with tables (part and
    detail; setting, before, after and why; step and command); numbered figures whose captions explain each
    panel; boxes marked NOTE, CAUTION and CHECK; a checklist (step, done when), a convergence table (parameter,
    how to test it) and a table of common problems (message, cause and fix); and a last section with which file
    to use, the steps with their commands, "A problem found on the way" and "Open points". Running title and
    page number on every page; 5 to 12 pages.
  - *Figures* in article style: serif type, ticks inward, two panels side by side, saved as PNG and PDF at 600
    dpi. The legend or the RMSE box goes top-left and the panel letters (a), (b) bottom-right, always. Parity
    plots have the reference on x. In the parity plots of a training, training points are blue and test points
    orange. The κ figure has (a) κ in W m⁻¹ K⁻¹ against T in K on a logarithmic axis, one line per run (colour
    for the source of the forces, solid for least squares, dashed for RFE), and (b) the difference to DFT with
    the same fit, in %.
  - *Units as I use them:* forces in eV/Å, force errors in meV/Å and as % of the DFT force RMS of the same
    structures; energies in meV/atom; force constants in eV/Å² and eV/Å³; frequencies in rad/ps (THz in the
    summary table); group velocities in km/s; scattering rates in ps⁻¹; κ in W/m·K; cutoffs in Å.
  - *The text* is in plain words and short sentences, explains every term in the glossary, says which numbers
    are training errors and which are held-out, and says what is not included and what was not checked.

## Sending things easily

- **Drop anything anywhere.** The program recognises POSCAR, INCAR, OUTCAR, vasprun.xml, `hipipe.cfg`,
  `train.job`, `shells.dat`, force-constant files, `CONTROL`, ShengBTE output, a model file or a run's `.json`
  and `.log` from my harness, `nep.in`, `loss.out`, `nep.txt`, `train.xyz` or a PDF, and offers what makes
  sense: check it, plot it, attach it to a material, launch the next step from it, explain it.
- **Command bar (Ctrl+K).** Go anywhere, find any run, and write requests in plain words ("launch training for
  PbTe with rfe", "why did the MgO fit fail", "report comparing Si and SiTorch"). A request becomes a prepared
  action shown for review, never something that runs by itself.
- **Before anything is sent** the program shows the exact command, the dry-run output and where it will run, and
  waits for me. It never deletes or overwrites anything on the cluster. Nothing is ever submitted to a cluster
  by the assistant or by a rule on its own: reading the queue and collecting results is free, sending needs my
  click each time.

## What to do next

Recommendations come first from fixed rules, not from a language model, so they are the same every time and can
be tested. Each one shows the evidence (file and value), the reason, and a button that opens the prepared step.

- **The order.** A stage is offered only when the one before it is finished. `hipipe.py check` must say `all
  good` before a fit. `cutoffs` must not be `auto` before a fit: run `shells --write` first.
- **Settings I chose, per material.** Si: `shells --c3 7.05 --c4 4.48`, which gives `MAX -5 -1` (third order up
  to about six shells, fourth order only the two nearest). The defaults of `hipipe` (targets 6.0 and 3.4 Å) are
  the CoSb3 choice, `MAX -15 -2`, fitted with least squares on 10 structures. C: `MAX -7 -2` on 5 structures,
  least squares first and `rfe` added later. Runs with forces from a potential use 20 structures, because they
  are cheap. For a new material, propose cutoffs at similar distances and show the shell table. For MgO and PbTe
  the cutoffs, the number of structures and the method are not in my notes: read them from their folders or ask
  me.
- **The fit.** With few structures offer `rfe`; offer least squares only when the force components clearly
  outnumber the parameters. Validation RMSE much above training RMSE means overfitting: more structures or
  shorter cutoffs. A fit of 512 atoms goes to the queue, not the login node. A result folder with the same name
  must be moved away first.
- **Before ShengBTE.** The first number of `FORCE_CONSTANTS_3RD` must be greater than 0. `CONTROL` must not have
  `ngrid` or `scell` 1 1 1. The job must be the copy of my working script (`bte_template`), not a plain
  `mpirun`. The q-mesh that `init` proposes is only a start: my Si reference runs use 22×22×22, and a run that
  will be compared must use the mesh of its reference.
- **Polar materials** (MgO, PbTe, and any new one the program detects as polar). They need the extra Born-charge
  run (`INFILES_LR`, `CALC_LR`, made by the wrapper with `-m pre … --lr`) and `--lr` in the fit. `hipipe` does
  not add `--lr` by itself: today I add it to `train.job` by hand, so propose to me a change to `hipipe` that
  does it from `polar = yes`. Before ShengBTE, `polar = yes` in `hipipe.cfg` and `CONTROL` with `born(`,
  `epsilon(` and `nonanalytic=.TRUE.`. Without this the optical branches and κ are wrong.
- **Comparisons.** When two variants of a material are finished, offer the comparison, reference first, and
  refuse to call it fair when structures, cutoffs, method or q-mesh differ; say which one differs. Report κ of a
  potential as the difference to DFT with the same fit, at each temperature, not only at 300 K. When κ
  disagrees, show where (force constants, frequencies, velocities, scattering rates) rather than only the total.
  Force errors of a potential tend to lower κ; say so next to the number.
- **Potentials.** Quote the error on structures the model did not see (cross-validation), never the training
  error, and say which one a number is. A difference smaller than the spread between seeds is not a difference.
  When one extreme structure dominates a mean, give it with and without it. Training error about equal to test
  error means the model is too small, not short of data: longer cutoffs (the angular one first, until it stops
  helping) and a larger basis come before more data. Improve a model by refining the existing one with a loss
  that weights each structure by the size of its forces, not by retraining from scratch with a plain loss, where
  the large-force structures swamp the small displacements that phonons need. Before a training, check that the
  chosen structures are spread over the force range and warn me if they are all nearly perfect crystals. The
  test that counts is physical: after the force error, offer the quick force-constant comparison on this
  computer, then the full chain against DFT.
- **Housekeeping the program checks by itself.** Files uploaded from Windows with dates in the future. A
  `vasprun.xml` that the cluster has compressed (read the OUTCAR, or note it). A stray folder inside `CALC`.
  `nep2vasp.py` and `torch2vasp.py` at different versions. A job name longer than 15 characters. The tools on
  the cluster older or newer than the copies on this computer. A second large training about to start on the GPU
  while one is running.
- **From the skills:** a relaxation that reached NSW without "reached required accuracy" → restart from CONTCAR;
  entropy term above 1 meV/atom → lower SIGMA; structures computed with different DFT settings in one data set →
  stop and recompute; validation loss rising while training falls → more data; MD frames with extrapolation
  grade above 1 → select them for DFT; a potential judged only by RMSE → say so and propose the physical tests.
- **What is open now** (verify each before showing it): PbTe has its VASP done and waits for the fit and
  ShengBTE; "C rfe" is still marked as missing on the board; a new Si data set is being computed and has a
  script to run when it comes back; my report on the latest Si torch model does not include its κ yet; a second
  batch of Si candidate structures had no DFT when last mentioned.

**The assistant** is Claude, run through the Claude Code already installed on this computer with my own login,
the way my board and ClaudeHub do it (no API key). It answers questions about the selected run or material,
writes and edits scripts, and explains results. It works with the real files, the Library and ClaudeHub's index,
says which file or source each statement comes from, and goes through the same review step as everything else.
Each message uses my quota, so nothing calls it in the background. The program is fully usable without it.

## What makes it trustworthy

- No invented numbers anywhere. A screen with no data says so. The one bundled example is labelled as an example
  on every screen where it appears.
- Every number carries its unit, and stresses and virials carry their sign convention, because VASP, ASE and
  GPUMD differ. Forces written by `torch2vasp.py` come with zero stress: show that, do not plot it.
- An output written by `nep2vasp.py` or `torch2vasp.py` looks like VASP but is not: the program tells them apart
  (a real OUTCAR has the VASP version line) and never mixes them into DFT data.
- POTCAR contents are never copied, stored or shown beyond the title and ENMAX: the files are licensed.
- Input syntax depends on the version of each code. The program knows the installed versions and checks what it
  writes against the documentation of that version; when it cannot be sure, it says so next to the line.
- Logins use the SSH keys and configuration I already have. No password or key is stored or copied by the
  program.
- My tools, the board and ClaudeHub keep working exactly as before whether Command Room is open or not.

## How it should look

A control room, not an office dashboard: dark by default (with a light theme), calm background, numbers,
commands and file contents in a monospaced face, colour reserved for state (to do, sent, done, failed, needs
attention) so that a red thing always means something, and a few live elements that make it feel switched on:
the queue, the curves of running jobs, the board filling in. A lot of information per screen, arranged so that
the eye finds the state first, then the numbers, then the detail. Fully usable from the keyboard. Use the
`frontend-design` and `dataviz` skills, and show me two visual directions with a real screen each before
building the rest.

## How to build it

- A local program with one installer for Windows x64, in a new top-level folder `command-room/`, released from
  GitHub Actions like the other apps in this repository. Suggested shape: a Python core (SSH, the queues,
  running my tools, parsing with ASE, pymatgen, phonopy and hiPhive, the rules, the PDF reports) behind a local
  API, a web interface in a native window, and a small local database that indexes materials, runs and jobs. My
  board and ClaudeHub already work this way (a local server and an app window); do not take their ports. Choose
  the packaging that gives a reliable installer and tell me what you chose and why.
- Where the program needs something my tools do not give (a machine-readable status, `--lr` from the config, a
  missing option), propose the change to the tool and show it to me; do not copy their logic into the program.
  Scripts written for me have no comments: a docstring with the usage, and `--help`. Every new command or script
  goes into my guide's catalogue, and the guide PDF is rebuilt.
- Large files (OUTCAR, `vasprun.xml`, trajectories) are read in a stream and in the background, and summarised
  on the cluster instead of downloaded; the interface never freezes. Anything that takes time shows a progress
  bar.
- Tests with real files, not made-up ones: `tests/data` of this repository, public VASP, hiPhive and ShengBTE
  examples, and my own files read where they are through the local file (in local tests only, never copied into
  the repository). Every parser is checked against known values, every rule has a case that triggers it and one
  that does not, and the whole path (launch → queue → result → comparison → report) runs in CI against stand-in
  `qsub`, `qstat`, `qdel`, `sbatch` and `squeue` and a copy of my folder layout. My Slurm sender already has a
  fake-VASP mode for this. Take screenshots of every screen in CI.

## Order of work

1. Read `command-room.local.md`, then what it points to: the source of my tools, the board, ClaudeHub, the guide
   and the PDFs; then the skills and this repository. With my permission, connect to the clusters to read only
   (queue, folders, versions, the wrapper's source) and fill in what is still unknown: the versions listed
   above, the settings and Born-charge runs of MgO and PbTe, and whether the tools there match the copies here.
   Ask me, in one message, what stays open: the VASP job script to adopt for the displaced structures, whether
   TorchNEP and GPUMD belong in the first version, what the MgO set on the Slurm cluster is for, and whether
   Command Room should one day replace the board and ClaudeHub or keep living next to them. Write a short plan
   with the list of screens and the two visual directions, and wait for my choice of direction only.
2. The core without the interface: connections, the three job sources, my tools with dry-run, parsers, checks
   and rules, tested.
3. The room: home, board, material, results, elements, library, on my real board and index and on the example.
4. Launch and jobs against the real clusters, with the review step.
5. Reports in the layouts described above, checked side by side against my PDFs; comparisons; the assistant.
6. The Windows installer, README with screenshots, a release.

At the end tell me plainly what was run on the real clusters, what was only tested against the stand-in queues,
and what you could not verify.

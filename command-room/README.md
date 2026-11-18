# Command Room

One place to prepare, launch, watch and analyse calculations of lattice thermal conductivity
(VASP → hiPhive force-constant fit → ShengBTE) and the potentials that stand in for DFT forces.

It is a local program: a small Python server on this computer and a window in the browser. It needs no
package beyond Python itself; the PDF reports also need matplotlib.

## Start it

```
python -m commandroom --open
```

Run it from this folder. It listens only on `127.0.0.1` (port 8791 unless you pass `--port`). With `--open`
it shows up as its own window (Edge or Chrome in app mode, the normal browser otherwise). If it is already
running, a second start only opens a window on it.

## What is in it

| Area | What it does |
|---|---|
| Overview | The pipeline: every material and variant as a line through the processes, read again every 3 seconds. Add, move and remove processes, rows and steps; set the state of a step; settings of each row. |
| Launch | Choose the kind of work (send jobs, follow them, collect results, fit, ShengBTE, train, compare, report), then the launcher: one of your own scripts with its fields. Every start is a plan: the exact command, where it runs, a dry run when there is one, and only then your click. |
| Jobs | The queues of the clusters (only while their switch is on), the automatic fetch of finished results, and this computer: jobs that report progress and everything started from Command Room, with its output and a Stop button. |
| Results | Thermal conductivity of ShengBTE runs against temperature and against a reference; training runs of the potentials, one section per element, with their curve and the error of every structure; collected VASP calculations, one group per set, with energy, forces and time of each. Each potential is shown against the reference conductivity, and results that came from a launch say so. |
| Reports | PDF reports of a conductivity comparison (one material) or of a training run. Old reports can be removed from the list. |
| Library | The rules the program applies and the explanations behind them, each with its source. |

The Ask button opens an assistant that answers a question about what is on screen. It runs through Claude
Code if that is installed, only when you ask, and it cannot run or send anything.

## What it reads and what it changes

It reads the work board's data file, the job files of the progress tracker, the result folders on this
computer, and a cluster queue when that cluster is switched on.

What it changes, and nothing else:

- its own files next to the settings: the pipeline file, the record of what was fetched, the output of what
  it started (`runs/`) and the reports;
- the work board, only through the board's own command line, when you change a state;
- a cluster, only with a plan you have just confirmed: a dry run first, then your click;
- this computer, by running one of your own launchers, only from a plan you have just confirmed;
- the result folders of this computer, by copying finished results from a cluster into them. This is the one
  thing it does by itself, and only for a cluster whose automatic fetch you switched on. On the cluster the
  fetch only reads.

A cluster that is switched off is never contacted. Logins use your own SSH key in batch mode; no password
or key is stored.

A cluster can instead be set to `"mode": "manual"` in the local settings. Command Room then never logs in to
it: it shows each command with a Copy button, you run it yourself, and you paste back what it printed (the
queue, a dry run). It can also write the command lines of your own sender script for a folder of
calculations (`"sender": "path of the script"`).

## Launchers

A launcher is one of your own commands, described in `launchers.local.json` next to the settings:

```json
{"launchers": [
  {"id": "send-tree", "process": "send", "label": "Job tree to the cluster", "what": "one sentence",
   "shell": "bash", "cwd": "folder it runs in", "contacts": "id of the cluster the script logs in to",
   "sends": true,
   "command": "bash send.sh submit {folder}{only}", "dry": "bash send.sh submit {folder}{only} --dry-run",
   "fields": [{"name": "folder", "label": "Folder", "required": true},
              {"name": "only", "label": "Only these", "format": " --only {value}"},
              {"name": "watch", "label": "Keep watching", "switch": " --watch"}]}
]}
```

`shell` is `bash`, `wsl` or `powershell`. `process` is one of `send`, `follow`, `collect`, `fit`, `bte`,
`train`, `compare`, `report`, `other`. A field's value is quoted for its shell unless the field says
`"raw": true`. A launcher with `"sends": true` and a `dry` command cannot start before its dry run passed.
A launcher with `"copy": true`, or one that contacts a cluster you run by hand, is never started: its command
is shown to be copied. If the settings name your guide catalogue (`"guide"`), every other script in it is
offered under "Any command" with one free command line.

The file, the settings and the pipeline file are read again whenever you save them, so edits made outside the
program show up by themselves.

### Launches in the pipeline

A launcher with a `"track"` puts what it starts into the pipeline: one row per piece of work, under its
material, in a group named after the kind of work, with one step per process.

```json
"track": {"group": "Potentials to ShengBTE", "material": "Si", "rows": "models",
          "steps": [{"stage": "vasp", "label": "Forces from the potential", "local": true, "until": "{row}: upload"},
                    {"stage": "training", "label": "Fit", "jobs": "{row} fit (?P<id>\d+)"},
                    {"stage": "shengbte", "label": "ShengBTE", "parts": [
                        {"label": "least squares", "jobs": "{row} ls (?P<id>\d+)", "result": "kappa:POT_{row}_ls"}]}]}
```

`rows` names the field whose values each make a row (without it the launch is one row, named by `row`).
`material`, `row`, `label` and `result` are templates: `{field}`, `{field|base}` (last part of a path),
`{field|material}` (X from a path with `X_data` or `DATA/X`) and `{field|or=Si}`. A step or part is read, never
set by hand: `local` follows the command on this computer; `jobs` is searched in what the command printed
(group `id` is the queue job, an optional group `part` makes one part per job) and then followed in the queue;
`result` is what must be on this computer when it is done (`kappa:NAME`, `potential:NAME`, `vasp:NAME`);
`"awaits": true` marks a part that only waits for its result, such as a collect. A job that left the queue
without its result, after the results were fetched again, is shown as failed. A launch you ran by hand is
tracked too: it stays "sent by you" until its result is here. Results that came from a launch say so, and the
step in the pipeline opens them.

## Local settings

Everything private lives in `settings.local.json` in this folder. It is never committed, and neither is any
file named `*.local.*`. Without it the program starts and says what is missing.

```json
{
  "python": "full path of the Python that runs the board's command line",
  "ssh": "full path of the ssh program",
  "board": {"data": "path of the board's data file", "tool": "path of the board's command line"},
  "hub": {"jobs": "folder with one JSON file per job"},
  "guide": "path of your guide catalogue (optional)",
  "shells": {"bash": "path of bash (optional)", "wsl_distro": "name of the WSL distribution (optional)"},
  "results": {"kappa": ["folders whose subfolders hold BTE.KappaTensorVsT files, * allowed"],
              "fetch_to": "where a fetched run of a new material goes, with {material}", "runs": ["folders with the run files of the trainings"],
              "vasp": ["folders that hold one folder per collected VASP calculation, * allowed"],
              "elements": {"Si": {"splits": ["split names"], "names": ["run name patterns, * allowed"], "sets": ["data set names"]}}},
  "clusters": [
    {"id": "torque", "label": "name shown in the window", "scheduler": "torque", "enabled": false,
     "host": "", "user": "", "key": "", "known_hosts": "", "path_prefix": "", "data": "", "tools": "", "activate": "",
     "results": "pattern of the finished result folders on the cluster, * allowed", "auto_fetch": false},
    {"id": "slurm", "label": "name shown in the window", "scheduler": "slurm", "enabled": false, "host": "", "user": ""}
  ]
}
```

Potentials of different elements are never compared, so every training run needs its element. It is taken
from an `element` field of the run file if there is one, then from the `elements` rules above (split first,
then run name, then data set), then from a data set whose name is a chemical formula (`C`, `MgO`). Runs that
say nothing get a section of their own. ShengBTE runs are split the same way by the material in their CONTROL
file (the `elements` and `types` lines).

Results reads the result folders again whenever a file appears or changes. A result for an element or
material that was not there before gets its own section at once, marked as new, and the window says so.

In Results, "What do these mean?" opens the words used on the page and a plain description of every run,
written from the run's own files (cutoffs, network, which structures trained it and which checked it, how it
was trained). In the graphs a point, a bar or a line can be clicked: the details of that model, run or
structure appear to the right of the graph.

## Tests

```
python -m unittest discover -s tests
```

They cover the pipeline rules and edits, the board reading and writing, the job sources, the result parsers,
the launch plans (with a stand-in for ssh), the launchers, running and stopping a command on this computer,
the fetch (with a stand-in for the cluster) and the server. Nothing in the tests contacts a real cluster.

## Not built yet

Fit quality and phonons read from the cluster, the periodic table of elements, a Spanish interface and a
Windows installer.

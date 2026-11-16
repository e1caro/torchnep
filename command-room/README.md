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
| Launch | One open step at a time: the exact command, where it runs, a dry run, and only then the button that sends it. |
| Jobs | The queues of the clusters (only while their switch is on) and the jobs on this computer. |
| Results | Thermal conductivity of ShengBTE runs against temperature and against a reference; training runs of the potentials, one section per element, with their curve and the error of every structure. |
| Reports | PDF reports of a conductivity comparison (one material) or of a training run. Old reports can be removed from the list. |
| Library | The rules the program applies and the explanations behind them, each with its source. |

The Ask button opens an assistant that answers a question about what is on screen. It runs through Claude
Code if that is installed, only when you ask, and it cannot run or send anything.

## What it reads and what it changes

It reads the work board's data file, the job files of the progress tracker, the result folders on this
computer, and a cluster queue when that cluster is switched on.

It changes three things and nothing else:

- its own pipeline file (`pipeline.local.json`);
- the work board, only through the board's own command line, when you change a state;
- a cluster, only with a plan you have just confirmed: a dry run first, then your click.

A cluster that is switched off is never contacted. Logins use your own SSH key in batch mode; no password
or key is stored.

A cluster can instead be set to `"mode": "manual"` in the local settings. Command Room then never logs in to
it: it shows each command with a Copy button, you run it yourself, and you paste back what it printed (the
queue, a dry run). It can also write the command lines of your own sender script for a folder of
calculations (`"sender": "path of the script"`).

## Local settings

Everything private lives in `settings.local.json` in this folder. It is never committed, and neither is any
file named `*.local.*`. Without it the program starts and says what is missing.

```json
{
  "python": "full path of the Python that runs the board's command line",
  "ssh": "full path of the ssh program",
  "board": {"data": "path of the board's data file", "tool": "path of the board's command line"},
  "hub": {"jobs": "folder with one JSON file per job"},
  "results": {"kappa": ["folders whose subfolders hold BTE.KappaTensorVsT files"], "runs": ["folders with the run files of the trainings"],
              "elements": {"Si": {"splits": ["split names"], "names": ["run name patterns, * allowed"], "sets": ["data set names"]}}},
  "clusters": [
    {"id": "torque", "label": "name shown in the window", "scheduler": "torque", "enabled": false,
     "host": "", "user": "", "key": "", "known_hosts": "", "path_prefix": "", "data": "", "tools": "", "activate": ""},
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
the launch plans (with a stand-in for ssh) and the server. Nothing in the tests contacts a real cluster.

## Not built yet

Fit quality and phonons read from the cluster, the periodic table of elements, a Spanish interface and a
Windows installer.

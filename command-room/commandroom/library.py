"""Library and Elements: the explanations and rules the interface can open, each with its source.

The pages are taken from the user's own tools, workflow guide and decisions, not written from memory; every
page names where it comes from so the interface can show it.
"""

PAGES = [
    {"id": "pipeline", "title": "The three stages", "tags": ["VASP", "Training", "ShengBTE"], "source": "work board and workflow guide",
     "text": ["VASP computes the forces of supercells with small random displacements. Training fits the force constants of 2nd, 3rd and 4th order with hiPhive. ShengBTE computes the thermal conductivity from the 2nd and 3rd order.",
              "A stage is offered only when the one before it is finished. The 4th order is fitted because it improves the 2nd and 3rd; ShengBTE does not read it."]},
    {"id": "hipipe", "title": "hipipe, command by command", "tags": ["hipipe", "init", "shells", "pre", "vasp", "forces", "check", "fit", "bte", "compare"], "source": "hipipe.py source",
     "text": ["Run in the calculation folder. Every command takes --cfg FILE and --dry-run, which prints what it would do. Jobs are only sent with --submit.",
              "init --dim X Y Z --label NAME: writes hipipe.cfg, makes SPOSCAR if missing, finds scell and proposes ngrid (a starting guess only).",
              "shells [--c3 A] [--c4 A] [--write]: lists the neighbour shells and chooses the cutoffs by distance; --write stores them.",
              "pre --n N: makes INFILES if needed and creates CALC/job-XX with the displaced structures.",
              "vasp [--submit]: writes run_vasp.job in every job folder from vasp_cmd. forces --source nep|torch: forces from a potential instead of VASP.",
              "check: counts job folders, finished OUTCARs and vasprun.xml, lists the problems, or prints 'all good'.",
              "fit [--submit]: writes train.job with the wrapper's post command. bte [--out DIR] [--only TEXT] [--submit]: one ShengBTE run per fitted set.",
              "compare --ref DIR --test DIR: the five comparison figures between two ShengBTE runs, reference first."]},
    {"id": "cutoffs", "title": "Cutoffs by neighbour shell", "tags": ["cutoffs", "shells", "MAX", "c3", "c4"], "source": "hipipe.py source and decisions in chats",
     "text": ["The 2nd order uses MAX, the largest cutoff the supercell allows. A negative number -k means just below shell k+1, so shells 0 to k are included.",
              "Shell numbers are not comparable between materials: compare distances. Si uses shells --c3 7.05 --c4 4.48, which gives MAX -5 -1. The defaults (6.0 and 3.4 A) give MAX -15 -2 for CoSb3. Diamond uses MAX -7 -2.",
              "The cutoffs must be stored (not 'auto') before a fit: run shells --write first."]},
    {"id": "methods", "title": "rfe against least squares", "tags": ["rfe", "least-squares", "fit", "overfitting"], "source": "workflow guide and decisions in chats",
     "text": ["rfe removes the parameters that do not matter and is the safe choice with few structures. Least squares keeps every parameter: good with plenty of data, prone to overfitting otherwise.",
              "Read the validation RMSE next to the training RMSE. Validation much above training means overfitting: add structures or shorten the cutoffs."]},
    {"id": "polar", "title": "Polar materials", "tags": ["polar", "Born charges", "non-analytic correction", "--lr", "CALC_LR"], "source": "wrapper options and decisions in chats",
     "text": ["Polar materials need an extra VASP run for the Born charges and the dielectric constant (INFILES_LR, CALC_LR), made by the wrapper with -m pre ... --lr, and --lr in the fit.",
              "hipipe does not add --lr by itself: it is added to the python line of train.job before sending it.",
              "Before ShengBTE: polar = yes in hipipe.cfg, and CONTROL must contain born(, epsilon( and nonanalytic=.TRUE. Without this the optical branches and the conductivity are wrong."]},
    {"id": "before-bte", "title": "Checks before ShengBTE", "tags": ["ShengBTE", "CONTROL", "FORCE_CONSTANTS_3RD", "ngrid", "scell"], "source": "bte_all.py source and decisions in chats",
     "text": ["The first number of FORCE_CONSTANTS_3RD must be greater than 0; if it is 0 the fit has no third order.",
              "CONTROL must not keep the wrapper defaults ngrid 1 1 1 or scell 1 1 1.",
              "The job is a copy of the ShengBTE script that already works (bte_template), with only the name changed.",
              "The q-mesh that init proposes is only a start. A run that will be compared must use the mesh of its reference."]},
    {"id": "compare", "title": "A fair comparison", "tags": ["compare", "reference", "parity"], "source": "compare scripts and decisions in chats",
     "text": ["Only one thing may change between the two runs: same structures (generated once and copied), same cutoffs, number of structures, fit method and q-mesh. The reference goes first.",
              "Each compare script drops a value only when the reference is below 1e-5, draws a parity plot with linear and logarithmic axes, and prints the RMSE. Third-order blocks are matched by their header, never by block number.",
              "Report the conductivity of a potential as the difference to DFT with the same fit, at each temperature."]},
    {"id": "potential", "title": "Judging a potential", "tags": ["potential", "held-out error", "cross-validation", "training error"], "source": "findings log and reports",
     "text": ["Quote the error on structures the model did not see, never the training error, and say which one a number is.",
              "Potentials of different elements are different potentials: their errors are never ranked together. Results keeps one section per element.",
              "A difference smaller than the spread between seeds is not a difference. When one extreme structure dominates a mean, give it with and without it.",
              "Training error about equal to test error means the model is too small: longer cutoffs (the angular one first) and a larger basis come before more data.",
              "Choose training structures spread over the force range, never only nearly perfect crystals. The test that counts is physical: force constants and conductivity against DFT."]},
    {"id": "problems", "title": "Problems met and their fix", "tags": ["errors", "fix"], "source": "chats and work-board notes",
     "text": ["'max() iterable argument is empty' in the wrapper: there is no CALC folder with finished jobs where it was run.",
              "'Something went wrong with this calculation': one OUTCAR did not finish. A stray folder inside CALC also counts as a job.",
              "The wrapper refuses to run when the result folder already exists: move the old one away first.",
              "A NoneType error inside ASE during the fit: nep2vasp.py and torch2vasp.py were at different versions. Keep them as a matching pair.",
              "Files uploaded from Windows can carry dates in the future: touch them. Old vasprun.xml files may be compressed on the cluster: read the OUTCAR.",
              "Job names longer than 15 characters are cut by the queue."]},
    {"id": "jobs", "title": "How jobs are shown", "tags": ["jobs", "queue", "progress"], "source": "ClaudeHub rules",
     "text": ["Jobs come from three places: the two cluster queues and this computer. A finished or failed job stays on screen for 5 minutes and then moves to the history.",
              "Trainings on this computer print rarely: a long silence is not a stall."]},
    {"id": "by-hand", "title": "A cluster you run yourself", "tags": ["you run it", "password", "copy", "paste"], "source": "the rules of this program",
     "text": ["A cluster can be set so that Command Room never logs in to it. The program then writes each command with a Copy button, you run it in your own terminal, and you paste back what it printed.",
              "This is for a cluster that asks for a password: the password is typed by you, in your terminal, and never passes through the program.",
              "Jobs reads the queue from what you paste. Launch reads the dry run you paste and only then shows the real command. The sender commands (see what it would do, send, how it is going, bring the results back) are written for a folder you name."]},
    {"id": "launchers", "title": "Launchers and what runs on this computer", "tags": ["launcher", "process", "run", "stop", "this computer"], "source": "the rules of this program",
     "text": ["A launcher is one of your own scripts with the fields it takes. Launch groups them by the kind of work: send jobs, follow them, collect results, fit, ShengBTE, train, compare, report.",
              "Starting one always goes through a plan that shows the exact command and where it runs. A launcher that sends work and has a dry run cannot start before the dry run passed.",
              "What Command Room starts on this computer is listed in Jobs with everything it printed, and Stop ends the script and whatever it started.",
              "A script that asks for a password is never started by the program: its command is shown for you to copy."]},
    {"id": "fetch", "title": "The automatic fetch of finished results", "tags": ["fetch", "results", "collect", "automatic"], "source": "the rules of this program",
     "text": ["For a cluster whose automatic fetch you switched on, Command Room looks for finished result folders when a job leaves the queue and every half hour, and copies their result files to this computer.",
              "On the cluster it only reads. A run that is already on this computer with the same file is not copied again; a new run goes next to the other runs of its material.",
              "A cluster you run yourself is never fetched from: Launch writes the collect command for you."]},
    {"id": "sending", "title": "What Command Room may send", "tags": ["submit", "dry run", "permission"], "source": "the rules of this program",
     "text": ["Reading a queue or a folder needs the cluster to be switched on by you. Sending work needs your click on a plan that shows the exact command, where it runs and the output of its dry run.",
              "Command Room never deletes or overwrites anything on a cluster, and nothing is sent by a rule or by the assistant on its own.",
              "The one thing it does by itself is the automatic fetch of finished results, which only reads on the cluster and only where you switched it on."]},
]

SYMBOLS = ("H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe "
           "Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn "
           "Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og").split()


def _position(z):
    """Period and column (1-18) of element z; lanthanides and actinides go to rows 8 and 9."""
    if 57 <= z <= 71:
        return 8, z - 57 + 3
    if 89 <= z <= 103:
        return 9, z - 89 + 3
    bounds = [(1, 2), (3, 10), (11, 18), (19, 36), (37, 54), (55, 86), (87, 118)]
    for period, (lo, hi) in enumerate(bounds, start=1):
        if lo <= z <= hi:
            i = z - lo
            if period == 1:
                return 1, 1 if i == 0 else 18
            if period in (2, 3):
                return period, i + 1 if i < 2 else i + 11
            if period in (4, 5):
                return period, i + 1
            return period, i + 1 if i < 2 else i - 14 + 1
    return 0, 0


def pages():
    return {"pages": PAGES}


def elements():
    out = []
    for z, symbol in enumerate(SYMBOLS, start=1):
        row, column = _position(z)
        out.append({"z": z, "symbol": symbol, "row": row, "column": column})
    return {"elements": out}

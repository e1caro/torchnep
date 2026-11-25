"""PDF reports in the layout of the user's own reports: A4 portrait, a cover, then one topic per page with a
dark band on top (title on the left, subtitle on the right), at most one figure, a striped table and a few
notes that say how to read it. Figures are in article style: serif type, ticks inward, legend top-left,
panel letters bottom-right.

Every number in a report is read from a result file. What was not read is listed on the last page.
"""
import os
import re
import time

from . import results

A4 = (8.27, 11.69)
NAVY, INK, MUTED, STRIPE, TEAL, GREY = "#14213d", "#1c2333", "#6b7385", "#eef1f6", "#1fa187", "#8d99ae"
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#c98500", "#d55181"]


def _plt():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    plt.rcParams.update({"font.family": "serif", "xtick.direction": "in", "ytick.direction": "in", "xtick.top": True,
                         "ytick.right": True, "axes.linewidth": 0.8, "font.size": 9, "pdf.fonttype": 42})
    return plt


def _page(plt, title, subtitle=""):
    fig = plt.figure(figsize=A4)
    band = fig.add_axes([0, 0.93, 1, 0.07])
    band.set_facecolor(NAVY)
    band.set_xticks([])
    band.set_yticks([])
    for side in band.spines.values():
        side.set_visible(False)
    band.text(0.045, 0.5, title, color="white", fontsize=18, fontweight="bold", va="center", family="sans-serif")
    band.text(0.955, 0.5, subtitle, color="#b9c2d6", fontsize=10, va="center", ha="right", family="sans-serif")
    return fig


def _cover(plt, name, what, lines, footer):
    fig = plt.figure(figsize=A4)
    back = fig.add_axes([0, 0, 1, 1])
    back.set_facecolor(NAVY)
    back.set_xticks([])
    back.set_yticks([])
    back.text(0.08, 0.66, name, color="white", fontsize=40, fontweight="bold", family="sans-serif", wrap=True)
    back.text(0.08, 0.60, what, color="white", fontsize=18, family="sans-serif")
    for i, line in enumerate(lines):
        back.text(0.08, 0.53 - 0.03 * i, line, color="#d5dbea", fontsize=13, family="sans-serif")
    back.text(0.08, 0.08, footer, color="#b9c2d6", fontsize=10, family="sans-serif")
    return fig


def _notes(fig, notes, top):
    y = top
    for note in notes:
        words, line, lines = note.split(), "", []
        for w in words:
            if len(line) + len(w) > 98:
                lines.append(line)
                line = w
            else:
                line = (line + " " + w).strip()
        lines.append(line)
        fig.text(0.07, y, "-", fontsize=10, color=INK, family="sans-serif")
        for text in lines:
            fig.text(0.09, y, text, fontsize=10, color=INK, family="sans-serif")
            y -= 0.018
        y -= 0.012
    return y


def _table(fig, top, header, rows, widths=None, row_h=0.027):
    from matplotlib.patches import Rectangle
    n = len(header)
    widths = widths or [1.0 / n] * n
    left, width = 0.07, 0.86
    ax = fig.add_axes([left, top - row_h * (len(rows) + 1), width, row_h * (len(rows) + 1)])
    ax.set_xlim(0, 1)
    ax.set_ylim(0, len(rows) + 1)
    ax.axis("off")
    xs = [sum(widths[:i]) for i in range(n)]
    for j, text in enumerate(header):
        ax.text(xs[j] + 0.012, len(rows) + 0.5, str(text), fontsize=9, fontweight="bold", color=MUTED, va="center", family="sans-serif")
    for i, row in enumerate(rows):
        y = len(rows) - 1 - i
        if i % 2 == 0:
            ax.add_patch(Rectangle((0, y), 1, 1, color=STRIPE, lw=0))
        for j, text in enumerate(row):
            ax.text(xs[j] + 0.012, y + 0.5, str(text), fontsize=9, color=INK, va="center", family="sans-serif")
    return top - row_h * (len(rows) + 1) - 0.03


def _num(v, digits=3):
    if v is None:
        return ""
    return f"{v:.0f}" if abs(v) >= 1000 else f"{v:.1f}" if abs(v) >= 100 else f"{v:.{max(digits - 1, 1)}f}"


def _letter(ax, letter):
    ax.text(0.96, 0.05, f"({letter})", transform=ax.transAxes, ha="right", va="bottom", fontsize=10)


def _safe(name):
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", name).strip("_") or "report"


def kappa_report(runs, reference, out_dir, which="conv"):
    """Compare ShengBTE runs: kappa against temperature and the difference to the reference with the same fit."""
    plt = _plt()
    from matplotlib.backends.backend_pdf import PdfPages
    runs = [r for r in runs if r.get(which)]
    if not runs:
        raise ValueError("none of the runs has a thermal-conductivity file for this solution")
    refs = {r["method"]: r for r in runs if r["source"] == reference}
    if not refs:
        raise ValueError(f"there is no run with forces from {reference}")
    others = [r for r in runs if r["source"] != reference]
    sources = sorted({r["source"] for r in others})
    def color(r):
        return INK if r["source"] == reference else SERIES[sources.index(r["source"]) % len(SERIES)]

    def label(r):
        return r["source"] + (", " + results.FIT[r["method"]] if r["method"] else "")

    def style(r):
        return "--" if r["method"] == "rfe" else "-"
    temps = sorted({p["T"] for r in runs for p in r[which]})
    solution = "iterative solution" if which == "conv" else "relaxation-time approximation"
    group = runs[0].get("group", "")
    path = os.path.join(out_dir, f"kappa_{_safe(group)}_{time.strftime('%Y%m%d_%H%M')}.pdf")
    os.makedirs(out_dir, exist_ok=True)
    diffs, unfair = {}, []
    for r in others:
        ref = refs.get(r["method"])
        if not ref:
            unfair.append(f"{label(r)}: there is no {reference} run with the same fit, so it has no difference.")
            continue
        diffs[r["id"]] = results.difference(r, ref, which)
        why = [x for x in results.comparable(r, ref) if "fit method" not in x]
        if why:
            unfair.append(f"{label(r)} is not a fair comparison with {label(ref)}: {'; '.join(why)}.")
    with PdfPages(path) as pdf:
        pdf.savefig(_cover(plt, "Thermal conductivity", f"{len(runs)} ShengBTE runs compared with {reference}",
                           [f"Forces from: {', '.join([reference] + sources)}", f"ShengBTE, {solution}, {int(temps[0])} to {int(temps[-1])} K",
                            "Every value is read from BTE.KappaTensorVsT; the mean of xx, yy and zz is shown."],
                           f"Command Room  -  {group}  -  {time.strftime('%Y-%m-%d')}"))
        fig = _page(plt, "Conductivity against temperature", "(a) values, (b) difference to " + reference)
        a = fig.add_axes([0.10, 0.60, 0.36, 0.27])
        b = fig.add_axes([0.57, 0.60, 0.36, 0.27])
        for r in runs:
            a.plot([p["T"] for p in r[which]], [p["k"] for p in r[which]], style(r), color=color(r), marker="o", ms=3, lw=1.4, label=label(r))
        a.set_yscale("log")
        every = [p["k"] for r in runs for p in r[which]]
        a.set_ylim(min(every) / 1.45, max(every) * (1.9 + 0.22 * len(runs)))
        a.set_xlabel("T (K)")
        a.set_ylabel(r"$\kappa$ (W m$^{-1}$ K$^{-1}$)")
        a.legend(loc="upper left", fontsize=6.5, frameon=True, edgecolor="#cccccc", bbox_to_anchor=(0.02, 0.98))
        _letter(a, "a")
        for r in others:
            if r["id"] in diffs:
                b.plot([p["T"] for p in diffs[r["id"]]], [p["pct"] for p in diffs[r["id"]]], style(r), color=color(r), marker="o", ms=3, lw=1.4, label=label(r))
        b.axhline(0, color=GREY, lw=0.8)
        spread = [p["pct"] for d in diffs.values() for p in d] + [0.0]
        span = (max(spread) - min(spread)) or 1.0
        b.set_ylim(min(spread) - 0.22 * span, max(spread) + (0.25 + 0.12 * len(diffs)) * span)
        b.set_xlabel("T (K)")
        b.set_ylabel(r"$\kappa$ difference to " + reference + ", same fit (%)")
        if diffs:
            b.legend(loc="upper left", fontsize=6.5, frameon=True, edgecolor="#cccccc", bbox_to_anchor=(0.02, 0.98))
        _letter(b, "b")
        notes = ["Colour is the source of the forces; a solid line is a least-squares fit and a dashed line an RFE fit.",
                 f"Panel (b) compares every run with the {reference} run that used the same fit method, so only the forces change."]
        flat = [(p["pct"], p["T"]) for d in diffs.values() for p in d]
        if flat:
            first = [p["pct"] for d in diffs.values() for p in d if p["T"] == temps[0]]
            last = [p["pct"] for d in diffs.values() for p in d if p["T"] == temps[-1]]
            if first and last:
                notes.append(f"At {int(temps[0])} K the runs are between {min(first):+.1f} % and {max(first):+.1f} % of {reference}; at {int(temps[-1])} K between {min(last):+.1f} % and {max(last):+.1f} %.")
        _notes(fig, notes + unfair, 0.52)
        pdf.savefig(fig)
        shown = temps if len(temps) <= 7 else temps[::max(1, len(temps) // 7)]
        fig = _page(plt, "Values", "thermal conductivity in W/(m K)")
        y = _table(fig, 0.88, ["Run"] + [f"{int(t)} K" for t in shown],
                   [[label(r)] + [_num(next((p["k"] for p in r[which] if p["T"] == t), None)) for t in shown] for r in runs],
                   widths=[0.30] + [0.70 / len(shown)] * len(shown))
        if diffs:
            fig.text(0.07, y, f"Difference to {reference} with the same fit, in %", fontsize=11, fontweight="bold", color=INK, family="sans-serif")
            y = _table(fig, y - 0.015, ["Run"] + [f"{int(t)} K" for t in shown],
                       [[label(r)] + [(f"{v:+.1f}" if v is not None else "") for v in [next((p["pct"] for p in diffs[r["id"]] if p["T"] == t), None) for t in shown]]
                        for r in others if r["id"] in diffs], widths=[0.30] + [0.70 / len(shown)] * len(shown))
        _notes(fig, ["Force errors of a potential tend to lower the conductivity: read a negative difference with that in mind."], y)
        pdf.savefig(fig)
        fig = _page(plt, "Settings and what is not included", "read from CONTROL")
        y = _table(fig, 0.88, ["Run", "Forces from", "Fit", "q-mesh", "Supercell", "scalebroad"],
                   [[r["name"], r["source"], results.FIT[r["method"]], r["control"].get("ngrid", ""), r["control"].get("scell", ""), r["control"].get("scalebroad", "")] for r in runs],
                   widths=[0.30, 0.22, 0.16, 0.12, 0.10, 0.10])
        _notes(fig, ["Not checked in this report: the quality of the force-constant fits (training against validation error), the phonon dispersion, the scattering rates, and the convergence with the q-mesh.",
                     "Not included: whether the runs used the same displaced structures and the same cutoffs. A comparison is only fair when just the source of the forces changes.",
                     "Glossary. Thermal conductivity: how well the lattice carries heat, in W/(m K). Iterative solution: the full solution of the phonon Boltzmann equation; the relaxation-time approximation is its first step. RFE and least squares: the two ways of fitting the force constants."], y)
        pdf.savefig(fig)
        plt.close("all")
    return path


def potential_report(run, summary, out_dir):
    """One training run of a potential: held-out against training error, the training curve and every structure."""
    plt = _plt()
    from matplotlib.backends.backend_pdf import PdfPages
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, f"potential_{_safe(run['name'])}_{time.strftime('%Y%m%d_%H%M')}.pdf")
    rows = run["rows"]
    sets = sorted({r["set"] for r in rows if r["set"]})

    def mean(role, name):
        values = [r["pct"] for r in rows if r["set"] == name and r["pct"] is not None and (r["role"] == "test") == (role == "test") and r["role"] != "unseen"]
        return sum(values) / len(values) if values else None
    held = summary.get("test") if summary else None
    with PdfPages(path) as pdf:
        head = (f"Force error on structures it did not see: {held:.2f} % of the DFT force RMS" if held is not None
                else "No structure was held out: every error in this report is a training error")
        element = (summary or {}).get("element")
        pdf.savefig(_cover(plt, run["name"], f"A training run of a potential for {element}" if element else "A training run of a potential", [head, f"{len(rows)} structures in {len(sets)} data set{'s' if len(sets) != 1 else ''}",
                           f"Training time: {run['seconds']:.0f} s" if run.get("seconds") else ""], f"Command Room  -  {time.strftime('%Y-%m-%d')}"))
        fig = _page(plt, "Results", "training error and held-out error")
        ax = fig.add_axes([0.12, 0.60, 0.78, 0.27])
        width = 0.38
        for k, (role, col, name) in enumerate((("train", GREY, "training structures"), ("test", TEAL, "held-out structures"))):
            values = [mean(role, s) or 0 for s in sets]
            ax.bar([i + (k - 0.5) * width for i in range(len(sets))], values, width, color=col, label=name)
        ax.set_xticks(range(len(sets)))
        ax.set_xticklabels(sets)
        ax.set_ylabel("force error (% of the DFT force RMS)")
        ax.legend(loc="upper left", fontsize=8, frameon=True, edgecolor="#cccccc")
        _letter(ax, "a")
        y = _table(fig, 0.53, ["Data set", "Training (%)", "Held-out (%)", "Structures"],
                   [[s, _num(mean("train", s)), _num(mean("test", s)), sum(1 for r in rows if r["set"] == s)] for s in sets])
        _notes(fig, ["The held-out error is the honest one: it is measured on structures that were not used for the fit. Quote it, not the training error.",
                     "The error is given as a percentage of the typical DFT force of the same structures, so data sets with small and large displacements can be compared."], y)
        pdf.savefig(fig)
        fig = _page(plt, "Training", "force error after each stretch of training")
        if run["curve"]:
            ax = fig.add_axes([0.12, 0.60, 0.78, 0.27])
            ax.plot([p["step"] for p in run["curve"]], [p["train"] for p in run["curve"]], "-o", color=SERIES[0], ms=3, lw=1.4, label="training structures")
            ax.plot([p["step"] for p in run["curve"]], [p["test"] for p in run["curve"]], "-o", color=SERIES[1], ms=3, lw=1.4, label="held-out structures")
            ax.set_yscale("log")
            ax.set_xlabel("training step")
            ax.set_ylabel("force error (meV/Å)")
            ax.legend(loc="upper left", fontsize=8, frameon=True, edgecolor="#cccccc")
            _letter(ax, "a")
            y = 0.53
        else:
            fig.text(0.07, 0.86, "This run has no log with a training curve.", fontsize=10, color=INK, family="sans-serif")
            y = 0.82
        cfg = run.get("cfg") or {}
        _table(fig, y, ["Setting", "Value"], [[k, str(v)] for k, v in cfg.items()][:14], widths=[0.4, 0.6])
        pdf.savefig(fig)
        for start in range(0, len(rows), 30):
            fig = _page(plt, "Error of each structure", f"structures {start + 1} to {min(start + 30, len(rows))} of {len(rows)}")
            _table(fig, 0.88, ["Data set", "Structure", "Seen in", "DFT force RMS (meV/Å)", "Force error (meV/Å)", "(%)"],
                   [[r["set"], r["structure"], "held out" if r["role"] == "test" else "never used" if r["role"] == "unseen" else "training",
                     _num(r["dft_rms"]), _num(r["force"]), _num(r["pct"])] for r in rows[start:start + 30]], widths=[0.16, 0.16, 0.16, 0.20, 0.18, 0.14])
            pdf.savefig(fig)
        fig = _page(plt, "What is not included, and glossary", "")
        _notes(fig, ["Not checked in this report: the physical tests. A potential judged only by its force error is not validated: compare its force constants and its thermal conductivity with DFT.",
                     "Force error (meV/Å): typical size of the difference between the forces of the model and the DFT forces.",
                     "Relative error (%): the force error divided by the DFT force RMS of the same structures.",
                     "Training against held-out error: the training error is measured on the data used for the fit; the held-out error on data the model never saw.",
                     "Cutoff radius: the distance up to which an atom sees its neighbours in the model."], 0.87)
        pdf.savefig(fig)
        plt.close("all")
    return path


def remove(out_dir, name):
    """Delete one report made here; only a PDF that sits directly in the reports folder can be named."""
    name = os.path.basename(str(name or ""))
    full = os.path.join(out_dir, name)
    if not name.lower().endswith(".pdf") or not os.path.isfile(full):
        return False
    os.remove(full)
    return True


def listing(out_dir):
    if not os.path.isdir(out_dir):
        return []
    files = [{"name": f, "modified": os.path.getmtime(os.path.join(out_dir, f)), "size": os.path.getsize(os.path.join(out_dir, f))}
             for f in os.listdir(out_dir) if f.lower().endswith(".pdf")]
    return sorted(files, key=lambda f: -f["modified"])

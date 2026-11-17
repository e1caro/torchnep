/* Results area: thermal conductivity of ShengBTE runs, the training runs of the potentials and the collected VASP calculations.
   Every number comes from a file the server read; a run without the file is not drawn. */
window.CRResults = (function () {
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const SERIES = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"];
  const FIT = { ls: "least squares", rfe: "RFE", "": "" };
  const fmt = (v, d) => v == null || isNaN(v) ? "" : d === 0 ? String(Math.round(v)) : Math.abs(v) >= 1000 ? v.toFixed(0) : Math.abs(v) >= 100 ? v.toFixed(1) : Math.abs(v) >= 1 ? v.toFixed(d == null ? 2 : d) : v.toPrecision(2);
  let LAUNCH = null, DATA = null, tab = "kappa", which = "conv", refSource = null, off = new Set(), runSel = null, RUN = null, showAll = false, host = null, elSel = null, matSel = null, vMat = null, want = null, fresh = new Set(), sel = {}, allModels = false, explain = false, metric = "all";
  try { explain = localStorage.getItem("cr-explain") === "1"; metric = localStorage.getItem("cr-metric") === "wo" ? "wo" : "all"; } catch (e) { explain = false; }
  /* Runs you selected to send somewhere (a launcher with a "models" field), kept between visits. */
  let chosen = new Set();
  try { chosen = new Set(JSON.parse(localStorage.getItem("cr-chosen") || "[]")); } catch (e) { chosen = new Set(); }
  const keepChosen = () => { try { localStorage.setItem("cr-chosen", JSON.stringify([...chosen])); } catch (e) { /* private mode */ } };
  const toggleChosen = (n) => { if (chosen.has(n)) chosen.delete(n); else chosen.add(n); keepChosen(); };
  const modelLaunchers = () => ((LAUNCH && LAUNCH.launchers) || []).filter((x) => x.fields.some((f) => f.kind === "models"));
  function selectionBar(runs) {
    const names = runs.map((r) => r.name).filter((n) => chosen.has(n)), other = [...chosen].filter((n) => !runs.some((r) => r.name === n));
    if (!names.length) return `<p class="fine">Tick runs in the table, or press Add to the selection beside a run you clicked in a graph, to send them on (for example to ShengBTE on the cluster).</p>`;
    const L = modelLaunchers();
    return `<div class="panel selbar"><h3>${names.length} selected</h3><div class="chips">${names.map((n) => `<span class="chip"><span class="mono">${esc(n)}</span><button class="icon" data-unchoose="${esc(n)}" aria-label="Remove ${esc(n)} from the selection">×</button></span>`).join("")}</div>` +
      `<div class="row-actions" style="margin-bottom:0">${L.map((x) => `<button class="solid" data-sendto="${esc(x.id)}" title="${esc(x.what)}">Send to: ${esc(x.label)}</button>`).join("") || `<span class="fine">No launcher takes a list of models yet (a field of kind "models" in your launchers file).</span>`}<button class="plain" data-clearchosen>Clear the selection</button></div>` +
      `<p class="fine">Send opens Launch with these runs filled in; there you prepare the plan, run the dry run and press Send yourself.${other.length ? ` ${other.length} selected run${other.length === 1 ? " is" : "s are"} in another section and not included.` : ""}</p></div>`;
  }
  /* The held-out error used to rank: all held-out structures, or without the hardest one (when the run has 3 or more). */
  const canWo = (runs) => runs.some((r) => r.test_wo != null);
  const val = (r) => metric === "wo" && r.test_wo != null ? r.test_wo : r.test;
  const byVal = (runs) => runs.slice().sort((a, b) => (val(a) == null) - (val(b) == null) || (val(a) || 0) - (val(b) || 0));
  /* What a run name says, from the naming rules of the local settings: short line, and the pieces one by one. */
  const says = (r) => (r && r.decoded && r.decoded.short) || "";
  const named = (r) => says(r) ? `${r.name} (${says(r)})` : r.name;
  const saysHTML = (r) => says(r) ? `<span class="says">${esc(says(r))}</span>` : "";
  const piecesHTML = (r) => !r || !r.decoded ? "" : `<dl class="pieces">${r.decoded.parts.map((p) => `<dt>${esc(p.piece)}</dt><dd class="${p.means ? (p.ok === false ? "wrong" : "") : "unknown"}">${p.means ? esc(p.means) : "no meaning recorded for this piece"}</dd>`).join("")}</dl>` +
    (r.decoded.warn.length ? `<p class="callout">${esc(r.decoded.warn.join("; "))}.</p>` : "");

  function ticksLog(lo, hi) {
    const out = [];
    for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++) for (const m of [1, 2, 5]) { const v = m * Math.pow(10, e); if (v >= lo * 0.999 && v <= hi * 1.001) out.push(v); }
    return out.length > 7 ? out.filter((v) => /^1(0*)$|^0\.0*1$/.test(String(v)) || Math.log10(v) % 1 === 0) : out;
  }
  function ticksLin(lo, hi) {
    const span = hi - lo || 1, raw = span / 5, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    const out = []; for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) out.push(Math.abs(v) < step * 1e-6 ? 0 : v);
    return out;
  }

  /* One line chart: series = [{name, color, dash, points: [{x, y}]}]. Hover shows every series at the nearest x. */
  function chart(el, o) {
    const S = o.series.filter((s) => s.points.length);
    if (!S.length) { el.innerHTML = `<p class="lead">${esc(o.empty || "Nothing to draw.")}</p>`; return; }
    const W = 580, H = 270, m = { l: 56, r: S.length <= 4 ? 74 : 16, t: 12, b: 38 };
    const xs = [...new Set(S.flatMap((s) => s.points.map((p) => p.x)))].sort((a, b) => a - b), ys = S.flatMap((s) => s.points.map((p) => p.y));
    let y0 = Math.min(...ys), y1 = Math.max(...ys);
    if (o.log) { y0 = Math.pow(10, Math.log10(y0) - 0.04); y1 = Math.pow(10, Math.log10(y1) + 0.04); }
    else { if (o.zero) { y0 = Math.min(y0, 0); y1 = Math.max(y1, 0); } const pad = (y1 - y0 || 1) * 0.08; y0 -= pad; y1 += pad; }
    const X = (v) => m.l + (xs.length > 1 ? (v - xs[0]) / (xs[xs.length - 1] - xs[0]) : 0.5) * (W - m.l - m.r);
    const Y = (v) => m.t + (1 - (o.log ? (Math.log10(v) - Math.log10(y0)) / (Math.log10(y1) - Math.log10(y0)) : (v - y0) / (y1 - y0))) * (H - m.t - m.b);
    const roomy = xs.length <= 8 && xs.every((x, i) => !i || X(x) - X(xs[i - 1]) >= 40);
    const yt = o.log ? ticksLog(y0, y1) : ticksLin(y0, y1), xt = roomy ? xs : ticksLin(xs[0], xs[xs.length - 1]);
    const path = (s) => s.points.map((p, i) => (i ? "L" : "M") + X(p.x).toFixed(1) + " " + Y(p.y).toFixed(1)).join(" ");
    const sw = (s) => `<svg class="sw" width="22" height="8" aria-hidden="true"><line x1="1" x2="21" y1="4" y2="4" stroke="${s.color}" stroke-width="2" ${s.dash ? 'stroke-dasharray="5 3"' : ""}/></svg>`;
    const id = "t" + Math.random().toString(36).slice(2, 8);
    el.innerHTML = `<div class="clegend">${S.map((s) => o.pick ? `<button type="button" class="lpick" data-pick="${esc(s.key)}" aria-pressed="${s.key === o.picked}">${sw(s)}${esc(s.name)}</button>` : `<span>${sw(s)}${esc(s.name)}</span>`).join("")}<button type="button" class="link ctoggle" aria-pressed="false">Show as table</button></div>
      <div class="cwrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label)}">
        ${yt.map((t) => `<line class="cgrid" x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="ctick" x="${m.l - 8}" y="${Y(t) + 4}" text-anchor="end">${fmt(t, 1)}</text>`).join("")}
        ${o.zero && !o.log ? `<line class="caxis" x1="${m.l}" x2="${W - m.r}" y1="${Y(0)}" y2="${Y(0)}"/>` : ""}
        ${xt.map((t) => `<text class="ctick" x="${X(t)}" y="${H - m.b + 16}" text-anchor="middle">${fmt(t, 0)}</text>`).join("")}
        <line class="caxis" x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}"/>
        <text class="ctick" x="${(m.l + W - m.r) / 2}" y="${H - 6}" text-anchor="middle">${esc(o.xlabel)}</text>
        ${S.map((s) => `<path class="cline ${o.picked ? (s.key === o.picked ? "on" : "dim") : ""}" d="${path(s)}" stroke="${s.color}" ${s.dash ? 'stroke-dasharray="6 4"' : ""}/>`).join("")}
        ${S.map((s) => s.points.map((p) => `<circle class="cdot" cx="${X(p.x)}" cy="${Y(p.y)}" r="3.5" fill="${s.color}"/>`).join("")).join("")}
        ${S.length <= 4 ? S.map((s) => { const p = s.points[s.points.length - 1]; return `<text class="cend" x="${X(p.x) + 8}" y="${Y(p.y) + 4}">${fmt(p.y)}</text>`; }).join("") : ""}
        <line class="ccross" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>
        <rect class="chit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/>
      </svg><div class="ctip" hidden></div></div>
      <p class="caxisnote">${esc(o.ylabel)}</p>
      <table class="grid ctable" id="${id}" hidden><thead><tr><th>${esc(o.xlabel)}</th>${S.map((s) => `<th>${esc(s.name)}</th>`).join("")}</tr></thead>
        <tbody>${xs.map((x) => `<tr><td class="num">${fmt(x, 0)}</td>${S.map((s) => { const p = s.points.find((q) => q.x === x); return `<td class="num">${p ? fmt(p.y) : ""}</td>`; }).join("")}</tr>`).join("")}</tbody></table>`;
    const svg = el.querySelector("svg"), tip = el.querySelector(".ctip"), cross = el.querySelector(".ccross"), hit = el.querySelector(".chit");
    hit.addEventListener("mousemove", (e) => {
      const r = svg.getBoundingClientRect(), vx = ((e.clientX - r.left) / r.width) * W;
      const x = xs.reduce((a, b) => Math.abs(X(b) - vx) < Math.abs(X(a) - vx) ? b : a), px = X(x);
      cross.setAttribute("x1", px); cross.setAttribute("x2", px); cross.setAttribute("visibility", "visible");
      tip.hidden = false; tip.style.left = Math.min(62, Math.max(2, (px / W) * 100)) + "%";
      tip.innerHTML = `<b>${fmt(x, 0)} ${esc(o.xunit || "")}</b>` + S.map((s) => { const p = s.points.find((q) => q.x === x); return p ? `<br>${sw(s)}${esc(s.name)}  ${fmt(p.y)} ${esc(o.unit || "")}` : ""; }).join("");
    });
    hit.addEventListener("mouseleave", () => { tip.hidden = true; cross.setAttribute("visibility", "hidden"); });
    if (o.pick) { hit.style.cursor = "pointer"; hit.addEventListener("click", (e) => {
      const r = svg.getBoundingClientRect(), vx = ((e.clientX - r.left) / r.width) * W, vy = ((e.clientY - r.top) / r.height) * H;
      const x = xs.reduce((a, b) => Math.abs(X(b) - vx) < Math.abs(X(a) - vx) ? b : a);
      const near = S.map((s) => ({ s, p: s.points.find((q) => q.x === x) })).filter((n) => n.p).sort((a, b) => Math.abs(Y(a.p.y) - vy) - Math.abs(Y(b.p.y) - vy))[0];
      if (near) choose(o.pick, near.s.key); }); }
    const btn = el.querySelector(".ctoggle"), table = el.querySelector(".ctable"), wrap = el.querySelector(".cwrap");
    btn.addEventListener("click", () => { const on = table.hidden; table.hidden = !on; wrap.hidden = on; btn.setAttribute("aria-pressed", on); btn.textContent = on ? "Show as chart" : "Show as table"; });
  }

  /* A section that stays closed until asked: title, a one-line conclusion, and a button that opens the graphs. */
  const open = new Set();
  const fold = (id, title, summary, body) => `<section class="fold ${open.has(id) ? "open" : ""}"><header><div><h3>${esc(title)}</h3><p>${esc(summary)}</p></div>
    <button class="plain" data-foldbtn="${id}" aria-expanded="${open.has(id)}">${open.has(id) ? "Close" : "Open"}</button></header><div class="foldbody" ${open.has(id) ? "" : "hidden"}>${body}</div></section>`;
  /* A graph with a place on its right for the details of whatever is clicked in it. */
  const withSide = (id, kind) => `<div class="withside"><div class="cbox" id="${id}" data-kind="${kind}"></div><aside class="side" data-side="${kind}" aria-live="polite"></aside></div>`;
  const facts = (list) => `<dl class="facts">${list.filter((f) => f[1] != null && f[1] !== "").map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;
  const aboutHTML = (a, skipName) => (a || []).filter((l) => !(skipName && l.label === "Name")).map((l) => `<p class="about"><b>${esc(l.label)}</b>${esc(l.text)}</p>`).join("");
  const clear = (kind) => `<button class="link" data-unpick="${kind}">Clear</button>`;
  function choose(kind, key) { sel[kind] = sel[kind] === key ? null : key; if (kind === "kappa") kappaDraw(); else if (kind === "vjob") vaspDraw(); else potentialDraw(); }
  const day = (t) => t ? new Date(t * 1000).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
  const launchedBy = (kind, key) => (DATA.launched || {})[kind + ":" + key] || null;
  /* The potential behind a source of forces: the training run whose name is the source, or the end of it after a prefix and "_". */
  const potOf = (src) => DATA.potentials.filter((q) => src === q.name || src.endsWith("_" + q.name)).sort((a, b) => b.name.length - a.name.length)[0] || null;
  const WORDS = {
    kappa: [["Run", "One ShengBTE calculation. Its name is the name of its folder."],
      ["Forces from", "Where the forces behind the force constants came from. DFT means VASP; any other name is a potential that took the place of VASP."],
      ["Fit", "How the force constants were fitted to those forces. Least squares keeps every parameter; RFE removes the ones that do not matter."],
      ["Reference", "The run the others are compared with, normally DFT. A run is only compared with the reference that used the same fit."],
      ["Iterative and RTA", "Two ways ShengBTE solves the equation. The iterative one is the converged answer; the relaxation time one is its first step."],
      ["q-mesh and supercell", "Settings that must be the same in two runs before their conductivities can be compared."]],
    potential: [["Run", "One training of a potential. Each run is one model, named as you named it when you started it."],
      ["Held-out error", "The force error on structures the model never saw while training. This is the honest accuracy."],
      ["Training error", "The force error on the structures it trained on. It always looks better; a held-out error far above it means overfitting."],
      ["% of the DFT force RMS", "The force error divided by the typical size of the DFT forces in those structures, so that gentle and violent structures can be compared."],
      ["Data set", "A group of structures that were computed together with VASP."],
      ["Split", "Which structures were used to train and which were held out."],
      ["Cutoffs", "How far an atom looks for neighbours, for distances and for angles. Longer cutoffs see more and cost more time."],
      ["Adam and L-BFGS", "The two stages of the training: Adam does most of the way, L-BFGS polishes the result."]],
    vasp: [["Set", "One folder of calculations that were sent together: one folder per structure inside it."],
      ["Calculation", "One VASP run on one structure. It is read from its OUTCAR, or from a small vasprun.xml when there is no OUTCAR."],
      ["Energy per atom", "The final energy of the structure divided by its number of atoms. Within a set, a higher energy means a more distorted structure."],
      ["Largest force", "The largest force on a single atom, in eV/\u00c5."],
      ["Force RMS", "The typical size of one force component (x, y or z) in the structure. Potentials are scored against this number."],
      ["Ended", "The OUTCAR has its closing timing block, so VASP reached the end. A calculation that did not end must not be used."],
      ["Core hours", "Time of the calculation multiplied by the number of cores it used."]],
  };
  function explainBox(kind, models, title) {
    if (!explain) return "";
    const shown = allModels ? models : models.slice(0, 8);
    const legend = (DATA.names || []).length ? `<h3>How the run names are built</h3><p class="fine">A name is read piece by piece, separated by _. Each piece below is shown with one name that uses it; the side panel of a run shows that run's own pieces, checked against its file.</p><dl class="pieces">${DATA.names.map((n) => `<dt>${esc(n.piece)}</dt><dd>${esc(n.means)} <span class="says" style="display:inline">for example ${esc(n.example)}</span></dd>`).join("")}</dl>` : "";
    return `<section class="panel explain"><h3>Words used here</h3><dl class="words">${WORDS[kind].map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>${legend}
      <h3>${esc(title)}</h3><p class="fine">Open a name to read what it is. Every sentence is taken from the files of that run.</p>
      ${shown.map((r) => `<details class="model"><summary><b>${esc(r.name)}</b><span>${esc([says(r), r.brief].filter(Boolean).join(" · "))}</span></summary>${aboutHTML(r.about) || `<p class="about">The files of this run do not say more.</p>`}</details>`).join("")}
      ${models.length > 8 ? `<p><button class="link" data-allmodels>${allModels ? "Show the first 8 only" : "Show all " + models.length}</button></p>` : ""}
      <p class="fine">The rules behind these numbers are in the <a href="#library">Library</a>.</p></section>`;
  }
  const group = (title, lead, inner) => `<div class="group"><h2>${esc(title)}</h2>${lead ? `<p class="lead">${lead}</p>` : ""}${inner}</div>`;
  const span = (v) => { const lo = Math.min(...v), hi = Math.max(...v); return Math.abs(hi - lo) < 0.05 ? fmt(lo) : `${fmt(lo)} to ${fmt(hi)}`; };
  const pct = (v) => (v > 0 ? "+" : "") + v.toFixed(1);

  function kappaData() {
    const runs = kRuns().filter((r) => !off.has(r.id)), others = [...new Set(kRuns().map((r) => r.source))].filter((x) => x !== refSource);
    const color = (r) => r.source === refSource ? "var(--ink)" : SERIES[others.indexOf(r.source) % SERIES.length], name = (r) => r.source + (r.method ? ", " + FIT[r.method] : "");
    const series = runs.map((r) => ({ key: r.id, name: name(r), color: color(r), dash: r.method === "rfe", points: (r[which] || []).map((p) => ({ x: p.T, y: p.k })) })).filter((x) => x.points.length);
    const diffs = [], unfair = [];
    for (const r of runs.filter((x) => x.source !== refSource)) {
      const ref = kRuns().find((x) => x.source === refSource && x.method === r.method);
      if (!ref) { unfair.push(`${name(r)}: there is no ${refSource} run with the same fit, so no difference is drawn.`); continue; }
      const why = ["ngrid", "scell", "scalebroad"].filter((k) => r.control[k] && ref.control[k] && r.control[k] !== ref.control[k]).map((k) => `${k} ${r.control[k]} against ${ref.control[k]}`);
      if (why.length) unfair.push(`${name(r)}: not a fair comparison, ${why.join(", ")}.`);
      const base = Object.fromEntries((ref[which] || []).map((p) => [p.T, p.k]));
      diffs.push({ key: r.id, name: name(r), color: color(r), dash: r.method === "rfe", points: (r[which] || []).filter((p) => base[p.T]).map((p) => ({ x: p.T, y: 100 * (p.k - base[p.T]) / base[p.T] })) });
    }
    const temps = [...new Set(series.flatMap((x) => x.points.map((p) => p.x)))].sort((a, b) => a - b), T0 = temps[0], T1 = temps[temps.length - 1];
    const at = (list, T) => list.map((x) => (x.points.find((p) => p.x === T) || {}).y).filter((v) => v != null);
    const sumA = !series.length ? "The chosen runs have no file for this solution." : `${series.length} runs from ${fmt(T0, 0)} to ${fmt(T1, 0)} K. At ${fmt(T0, 0)} K they give ${span(at(series, T0))} W/(m K); at ${fmt(T1, 0)} K, ${span(at(series, T1))}.`;
    const d0 = at(diffs, T0), d1 = at(diffs, T1);
    const sumB = !d0.length ? `No run to compare with ${refSource}.` : `With the same fit, the other runs are ${pct(Math.min(...d0))} % to ${pct(Math.max(...d0))} % from ${refSource} at ${fmt(T0, 0)} K, and ${pct(Math.min(...d1))} % to ${pct(Math.max(...d1))} % at ${fmt(T1, 0)} K.`;
    const grids = [...new Set(runs.map((r) => r.control.ngrid).filter(Boolean))], cells = [...new Set(runs.map((r) => r.control.scell).filter(Boolean))];
    const sumC = unfair.length ? `${unfair.length} run${unfair.length === 1 ? " is" : "s are"} not a fair comparison. Open to see why.` : grids.length === 1 && cells.length === 1 ? `Every run uses the q-mesh ${grids[0]} and the supercell ${cells[0]}: the comparison is fair on these settings.` : "The runs do not all share the same q-mesh or supercell.";
    return { runs, series, diffs, unfair, sumA, sumB, sumC };
  }
  /* One line per source of forces that is not the reference: its conductivity next to the reference with the same fit, and the potential behind it. */
  function linkData() {
    const all = kRuns(), T = [...new Set(all.flatMap((r) => (r[which] || []).map((p) => p.T)))].sort((a, b) => a - b);
    if (!T.length) return null;
    const T0 = T.reduce((a, b) => Math.abs(b - 300) < Math.abs(a - 300) ? b : a), T1 = T[T.length - 1];
    const kAt = (r, t) => r ? ((r[which] || []).find((p) => p.T === t) || {}).k : null;
    const others = all.filter((r) => r.source !== refSource), methods = ["ls", "rfe", ""].filter((m) => others.some((r) => r.method === m) && all.some((r) => r.source === refSource && r.method === m));
    const rows = [...new Set(others.map((r) => r.source))].map((src) => {
      const pot = potOf(src), cells = {};
      for (const m of methods) { const r = all.find((x) => x.source === src && x.method === m), ref = all.find((x) => x.source === refSource && x.method === m);
        const k0 = kAt(r, T0), b0 = kAt(ref, T0), k1 = kAt(r, T1), b1 = kAt(ref, T1);
        cells[m] = { run: r, k0, d0: k0 != null && b0 ? 100 * (k0 - b0) / b0 : null, d1: k1 != null && b1 ? 100 * (k1 - b1) / b1 : null }; }
      const d = methods.map((m) => cells[m].d0).filter((v) => v != null);
      return { src, pot, cells, worst: d.length ? Math.max(...d.map(Math.abs)) : null, run: (methods.map((m) => cells[m].run).find(Boolean) || {}) };
    }).filter((r) => r.run.id).sort((a, b) => (a.worst == null) - (b.worst == null) || (a.worst || 0) - (b.worst || 0));
    return { T0, T1, methods, rows };
  }
  function linkFold() {
    const D = linkData();
    if (!D || !D.rows.length) return "";
    const withPot = D.rows.filter((r) => r.pot && val(r.pot) != null), best = D.rows.find((r) => r.worst != null), bestPot = withPot.slice().sort((a, b) => val(a.pot) - val(b.pot))[0];
    const sum = !best ? `No run can be compared with ${refSource}: there is no ${refSource} run with the same fit.` :
      `${D.rows.length} source${D.rows.length === 1 ? "" : "s"} of forces against ${refSource} at ${fmt(D.T0, 0)} K. Closest: ${best.pot ? best.pot.name : best.src}, within ${fmt(best.worst)} %.` +
      (bestPot && bestPot !== best && bestPot.worst != null ? ` The potential with the lowest force error, ${bestPot.pot.name}, is within ${fmt(bestPot.worst)} %.` : bestPot && bestPot === best ? " It is also the potential with the lowest force error." : "");
    const head = D.methods.map((m) => `<th>\u03ba at ${fmt(D.T0, 0)} K, ${esc(FIT[m] || "fit")}<br>W/(m K)</th><th>from ${esc(refSource)}<br>at ${fmt(D.T0, 0)} K (%)</th><th>from ${esc(refSource)}<br>at ${fmt(D.T1, 0)} K (%)</th>`).join("");
    const body = D.rows.map((r) => `<tr><td style="min-width:250px"><b class="tname">${esc(r.pot ? r.pot.name : r.src)}</b>${r.pot ? saysHTML(r.pot) : ""}${launchedBy("kappa", r.run.id) ? `<span class="says">launched from Command Room, ${esc(day(launchedBy("kappa", r.run.id).started))}</span>` : ""}</td>
      ${withPot.length ? `<td class="num">${r.pot && val(r.pot) != null ? fmt(val(r.pot)) : ""}</td>` : ""}
      ${D.methods.map((m) => { const c = r.cells[m]; return `<td class="num">${c.k0 == null ? "" : fmt(c.k0)}</td><td class="num">${c.d0 == null ? "" : pct(c.d0)}</td><td class="num">${c.d1 == null ? "" : pct(c.d1)}</td>`; }).join("")}
      <td class="act">${r.run.id ? `<button class="link" data-kshow="${esc(r.run.id)}">Show its line</button>` : ""}${r.pot ? ` <button class="link" data-topot="${esc(r.pot.name)}">Its potential</button>` : ""}</td></tr>`).join("");
    return fold("kl", `Each source of forces against ${refSource}`, sum, `<table class="grid"><thead><tr><th>Forces from</th>${withPot.length ? `<th>Held-out force<br>error (%)</th>` : ""}${head}<th></th></tr></thead><tbody>${body}</tbody></table>
      <p class="fine">Closest to ${esc(refSource)} first. Each run is compared with the ${esc(refSource)} run that used the same fit. The force error is the one of the Potentials section${metric === "wo" ? ", without the hardest held-out structure" : ""}.</p>`);
  }
  /* Runs of different materials are never drawn together: one section per material. */
  const kRuns = () => DATA.kappa.filter((r) => (r.material || "") === matSel);
  const sections = (list, key) => { const m = new Map(); for (const r of list) { const k = r[key] || ""; if (!m.has(k)) m.set(k, []); m.get(k).push(r); }
    return [...m].map(([id, runs]) => ({ id, runs })).sort((a, b) => (a.id === "") - (b.id === "") || b.runs.length - a.runs.length); };
  const newTag = (k) => fresh.has(k) ? `<small class="newtag">new</small>` : "";
  function kappaView() {
    if (!DATA.kappa.length) return `<p class="empty">No ShengBTE result was found on this computer. Give the folders that hold the result folders in the local settings (results, kappa), or collect the results from the cluster first.</p>`;
    const mats = sections(DATA.kappa, "material");
    if (matSel == null || !mats.some((g) => g.id === matSel)) matSel = mats[0].id;
    const tiles = `<div class="places">${mats.map((g) => { const n = new Set(g.runs.map((r) => r.source)).size;
      return `<button class="place" data-kmat="${esc(g.id)}" aria-pressed="${g.id === matSel}"><b>${esc(g.id || "Material not known")}${newTag("k:" + g.id)}<em>${g.runs.length}</em></b><span>${g.runs.length === 1 ? "run" : "runs"}, forces from ${n} ${n === 1 ? "source" : "sources"}</span></button>`; }).join("")}</div>
      ${matSel === "" ? `<p class="empty">The CONTROL file of these runs has no elements line, so their material is not known.</p>` : ""}`;
    const all = kRuns();
    if (!all.length) return `<p class="empty">No ShengBTE result was found on this computer. Give the folders that hold the result folders in the local settings (results, kappa), or collect the results from the cluster first.</p>`;
    const sources = [...new Set(all.map((r) => r.source))];
    if (!sources.includes(refSource)) refSource = sources.includes("DFT") ? "DFT" : sources[0];
    const K = kappaData();
    return tiles + explainBox("kappa", all.map((r) => ({ ...r, brief: "forces from " + r.source + (r.method ? ", " + FIT[r.method] : "") })), `The ${matSel ? matSel + " " : ""}runs, one by one`) + `<div class="panel controls"><label class="field">Reference<select id="kref">${sources.map((x) => `<option ${x === refSource ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label>
        <label class="field">Solution<select id="kwhich"><option value="conv" ${which === "conv" ? "selected" : ""}>iterative (converged)</option><option value="rta" ${which === "rta" ? "selected" : ""}>relaxation time (RTA)</option></select></label>
        <div class="runs"><span class="fine">Runs</span>${all.map((r) => `<label class="check"><input type="checkbox" data-run="${esc(r.id)}" ${off.has(r.id) ? "" : "checked"}> ${esc(r.name)}${saysHTML(r)}</label>`).join("")}</div></div>
      ${group("The conductivity", "", linkFold() + fold("ka", "Thermal conductivity against temperature", K.sumA, withSide("ka", "kappa")) +
        fold("kb", `Difference to ${refSource} with the same fit`, K.sumB, withSide("kb", "kappa")))}
      ${group("Is the comparison fair?", "", fold("kc", "Settings of each run", K.sumC, `${K.unfair.map((t) => `<p class="callout">${esc(t)}</p>`).join("")}
        <table class="grid"><thead><tr><th>Run</th><th>Forces from</th><th>Fit</th><th>q-mesh</th><th>Supercell</th><th>scalebroad</th><th>Non-analytic term</th></tr></thead><tbody>${all.map((r) => `<tr><td class="name">${esc(r.name)}${saysHTML(r)}</td><td>${esc(r.source)}</td><td>${esc(FIT[r.method])}</td><td class="num">${esc(r.control.ngrid || "")}</td><td class="num">${esc(r.control.scell || "")}</td><td class="num">${esc(r.control.scalebroad || "")}</td><td>${r.control.nonanalytic ? "on" : "off"}</td></tr>`).join("")}</tbody></table>`))}`;
  }
  function kappaDraw() {
    if (!host.querySelector("#ka")) return;
    const K = kappaData();
    chart(host.querySelector("#ka"), { label: "Thermal conductivity against temperature", xlabel: "Temperature (K)", xunit: "K", ylabel: "κ in W/(m K), mean of xx, yy and zz, logarithmic axis", unit: "W/(m K)", log: true, empty: "The chosen runs have no file for this solution.", series: K.series, pick: "kappa", picked: sel.kappa });
    chart(host.querySelector("#kb"), { label: "Difference to the reference", xlabel: "Temperature (K)", xunit: "K", ylabel: "Difference of κ to the reference with the same fit, in %", unit: "%", zero: true, series: K.diffs, empty: "Choose at least one run that is not the reference.", pick: "kappa", picked: sel.kappa });
    host.querySelectorAll('[data-side="kappa"]').forEach((a) => { a.innerHTML = kappaSide(); });
  }
  function kappaSide() {
    const r = kRuns().find((x) => x.id === sel.kappa);
    if (!r) return `<p class="hint">Click a line, or a name above the graph, to see that run here.</p>`;
    const pts = r[which] || [], ref = kRuns().find((x) => x.source === refSource && x.method === r.method);
    const base = ref && ref !== r ? Object.fromEntries((ref[which] || []).map((p) => [p.T, p.k])) : null;
    const ends = pts.length > 1 ? [pts[0], pts[pts.length - 1]] : pts, by = launchedBy("kappa", r.id), pot = potOf(r.source);
    return `<h4>${esc(r.name)}</h4>${piecesHTML(r)}<p class="brief">forces from ${esc(r.source)}${r.method ? ", " + esc(FIT[r.method]) : ""}</p>` +
      facts(ends.map((p) => [`κ at ${fmt(p.T, 0)} K`, `${fmt(p.k)} W/(m K)` + (base && base[p.T] ? ` (${pct(100 * (p.k - base[p.T]) / base[p.T])} % from ${refSource})` : "")])
        .concat([["Its potential", pot && val(pot) != null ? `${fmt(val(pot))} % held-out force error` : ""], ["Launched", by ? `${day(by.started)}, from Command Room` : ""]])) + aboutHTML(r.about, true) +
      `<p>${pot ? `<button class="plain" data-topot="${esc(pot.name)}">See its potential</button> ` : ""}<button class="link" data-act="open" data-what="kappa" data-id="${esc(r.id)}">Open its folder</button> ${clear("kappa")}</p>`;
  }

  /* Horizontal bars with the value written at the end of each bar. items = [{label, value, color}] */
  function bars(el, o) {
    const I = o.items.filter((i) => i.value != null);
    if (!I.length) { el.innerHTML = `<p class="lead">${esc(o.empty || "Nothing to draw.")}</p>`; return; }
    const W = 580, row = 22, m = { l: 150, r: 56, t: 6, b: 26 }, H = m.t + m.b + row * I.length, max = Math.max(...I.map((i) => i.value)), X = (v) => m.l + (v / max) * (W - m.l - m.r);
    el.innerHTML = `<div class="cwrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label)}">
      ${ticksLin(0, max).map((t) => `<line class="cgrid" x1="${X(t)}" x2="${X(t)}" y1="${m.t}" y2="${H - m.b}"/><text class="ctick" x="${X(t)}" y="${H - m.b + 14}" text-anchor="middle">${fmt(t, 1)}</text>`).join("")}
      ${I.map((i, k) => { const y = m.t + k * row; return `<g ${o.pick ? `class="pick ${i.key === o.picked ? "on" : ""}" data-pick="${esc(i.key)}" tabindex="0" role="button"` : ""}><rect x="0" y="${y}" width="${W}" height="${row}" fill="transparent"/><title>${esc(i.label)}${i.hint ? " (" + esc(i.hint) + ")" : ""}: ${fmt(i.value)} ${esc(o.unit || "")}</title><text class="ctick" x="${m.l - 8}" y="${y + 14}" text-anchor="end">${esc(i.label.length > 22 ? i.label.slice(0, 21) + "…" : i.label)}</text>
        <rect x="${m.l}" y="${y + 4}" width="${Math.max(1, X(i.value) - m.l)}" height="${row - 8}" rx="3" fill="${i.color || "var(--c1)"}"/><text class="cend" x="${X(i.value) + 6}" y="${y + 14}">${fmt(i.value)}</text></g>`; }).join("")}
      <line class="caxis" x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${H - m.b}"/></svg></div><p class="caxisnote">${esc(o.note || "")}</p>`;
  }
  /* Points on two axes. series = [{name, color, points: [{x, y, label}]}] */
  function scatter(el, o) {
    const S = o.series.map((s) => ({ ...s, points: s.points.filter((p) => p.x != null && p.y != null && (!o.logx || p.x > 0) && (!o.logy || p.y > 0)) })).filter((s) => s.points.length);
    if (!S.length) { el.innerHTML = `<p class="lead">${esc(o.empty || "Nothing to draw.")}</p>`; return; }
    const W = 580, H = 270, m = { l: 56, r: 16, t: 12, b: 38 }, all = S.flatMap((s) => s.points);
    const lx = (v) => o.logx ? Math.log10(v) : v, ly = (v) => o.logy ? Math.log10(v) : v;
    const pad = (lo, hi, log) => log ? [Math.pow(10, Math.log10(lo) - 0.06), Math.pow(10, Math.log10(hi) + 0.06)] : [lo - (hi - lo || 1) * 0.06, hi + (hi - lo || 1) * 0.06];
    const [x0, x1] = pad(Math.min(...all.map((p) => p.x)), Math.max(...all.map((p) => p.x)), o.logx), [y0, y1] = pad(Math.min(...all.map((p) => p.y)), Math.max(...all.map((p) => p.y)), o.logy);
    const X = (v) => m.l + (lx(v) - lx(x0)) / (lx(x1) - lx(x0)) * (W - m.l - m.r), Y = (v) => m.t + (1 - (ly(v) - ly(y0)) / (ly(y1) - ly(y0))) * (H - m.t - m.b);
    const xt = o.logx ? ticksLog(x0, x1) : ticksLin(x0, x1), yt = o.logy ? ticksLog(y0, y1) : ticksLin(y0, y1);
    el.innerHTML = `${S.length > 1 ? `<div class="clegend">${S.map((s) => `<span><svg class="sw" width="10" height="10" aria-hidden="true"><circle cx="5" cy="5" r="4" fill="${s.color}"/></svg>${esc(s.name)}</span>`).join("")}</div>` : ""}
      <div class="cwrap"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label)}">
      ${yt.map((t) => `<line class="cgrid" x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="ctick" x="${m.l - 8}" y="${Y(t) + 4}" text-anchor="end">${fmt(t, 1)}</text>`).join("")}
      ${xt.map((t) => `<text class="ctick" x="${X(t)}" y="${H - m.b + 16}" text-anchor="middle">${fmt(t, o.xwhole ? 0 : 1)}</text>`).join("")}
      <line class="caxis" x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}"/><text class="ctick" x="${(m.l + W - m.r) / 2}" y="${H - 6}" text-anchor="middle">${esc(o.xlabel)}</text>
      ${S.flatMap((s) => s.points.map((p) => ({ s, p }))).sort((a, b) => (a.p.key === o.picked) - (b.p.key === o.picked)).map(({ s, p }) => `<circle class="cdot ${o.pick ? "pick" : ""} ${o.pick && p.key === o.picked ? "on" : ""}" ${o.pick ? `data-pick="${esc(p.key)}" tabindex="0" role="button"` : ""} cx="${X(p.x)}" cy="${Y(p.y)}" r="${o.pick && p.key === o.picked ? 7 : 4.5}" fill="${s.color}"><title>${esc(p.label)}: ${fmt(p.x)} ${esc(o.xunit || "")}, ${fmt(p.y)} ${esc(o.unit || "")}</title></circle>`).join("")}
      </svg></div><p class="caxisnote">${esc(o.ylabel)}</p>`;
  }

  /* Potentials of different elements are never compared: one section per element. */
  function elements() {
    return sections(DATA.potentials, "element").map((g) => ({ el: g.id, runs: g.runs }));
  }
  const elRuns = () => DATA.potentials.filter((r) => (r.element || "") === elSel);
  function potentialView() {
    if (!DATA.potentials.length) return `<p class="empty">No training run was found on this computer. Give the folders with the run files in the local settings (results, runs).</p>`;
    const groups = elements();
    if (elSel == null || !groups.some((g) => g.el === elSel)) elSel = DATA.potentials.slice().sort((a, b) => (b.modified || 0) - (a.modified || 0))[0].element || "";
    const tiles = `<div class="places">${groups.map((g) => { const b = byVal(g.runs).find((r) => val(r) != null);
      return `<button class="place" data-pel="${esc(g.el)}" aria-pressed="${g.el === elSel}"><b>${esc(g.el || "Element not known")}${newTag("p:" + g.el)}<em>${g.runs.length}</em></b><span>${g.runs.length === 1 ? "run" : "runs"}${b ? `, best ${fmt(val(b))} % held out${metric === "wo" && b.test_wo != null ? " (without the hardest)" : ""}` : ", none with held-out structures"}</span></button>`; }).join("")}</div>
      ${elSel === "" ? `<p class="empty">These runs do not say which element they are for. Name it in the local settings (results, elements) by split, run name or data set, or write an "element" field into the run file.</p>` : ""}`;
    const runs = byVal(elRuns()), of = elSel ? elSel + " " : "", wo = metric === "wo" && canWo(runs);
    const held = runs.filter((r) => val(r) != null), best = held[0], shown = showAll ? runs : runs.slice(0, 25);
    const near = held.filter((r) => r.seconds && val(r) <= val(best) * 1.5).sort((a, b) => a.seconds - b.seconds)[0];
    const what = wo ? "on the structures it did not see, leaving out the hardest one" : "on structures it did not see";
    const sumRank = best ? `Best: ${named(best)}, ${fmt(val(best))} % ${what}.${held[11] ? ` The 12 best are all under ${fmt(val(held[11]))} %.` : ""}` : "No run held structures out.";
    const sumTime = near && best ? (near.name === best.name ? `${named(best)} is also the fastest among the good ones: ${Math.round(best.seconds)} s.` : `${named(near)} gets ${fmt(val(near))} % in ${Math.round(near.seconds)} s; the best, ${named(best)}, takes ${best.seconds ? Math.round(best.seconds) + " s" : "an unknown time"}.`) : "The runs did not record their time.";
    const hard = runs.map((r) => r.hardest && r.hardest.structure).filter(Boolean), same = hard.length && hard.every((h) => h === hard[0]) ? hard[0] : null;
    const switcher = canWo(runs) ? `<div class="seg" style="margin:8px 0 2px"><button aria-pressed="${!wo}" data-pmetric="all">All held-out structures</button><button aria-pressed="${wo}" data-pmetric="wo">Without the hardest one</button></div>
      <p class="fine">${wo ? `Each run is ranked by its held-out error without its single worst held-out structure${same ? ` (here always ${esc(same)})` : ""}. Use this when one violent structure decides the order: its error depends a lot on the random start of the training.` : `Mean over every held-out structure. Switch to "without the hardest one" when one violent structure${same ? ` (here ${esc(same)})` : ""} dominates the mean.`}</p>` : "";
    let one = `<p class="empty">Choose a run above to see its graphs.</p>`;
    if (runSel && RUN && RUN.name === runSel) {
      const c = RUN.curve, lb = c.findIndex((p) => p.phase === "L-BFGS"), rows = RUN.rows.filter((r) => r.pct != null);
      const mean = (role) => { const v = rows.filter((r) => (role === "test" ? r.role === "test" : r.role !== "test" && r.role !== "unseen")).map((r) => r.pct); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
      const h = mean("test"), t = mean("train"), worst = rows.slice().sort((x, y) => y.pct - x.pct)[0];
      const sumCurve = c.length ? `The error on held-out structures fell from ${fmt(c[0].test)} to ${fmt(c[c.length - 1].test)} meV/Å in ${c[c.length - 1].step} steps.${lb > 0 ? ` L-BFGS took it from ${fmt(c[lb - 1].test)} to ${fmt(c[lb].test)}.` : ""}` : "This run has no log with a training curve.";
      const sumSets = h != null && t != null ? `${fmt(h)} % on held-out structures against ${fmt(t)} % in training: ${h > 1.5 * t ? "a clear gap, the model fits its own data better than new data" : "close together, no sign of overfitting"}.` : t != null ? `${fmt(t)} % in training. No structure was held out, so this is not an honest accuracy.` : "This run kept no table per structure.";
      const sumSize = rows.length ? `Between ${fmt(Math.min(...rows.map((r) => r.pct)))} % and ${fmt(Math.max(...rows.map((r) => r.pct)))} % over ${rows.length} structures. The largest error is on ${worst.set} ${worst.structure}.` : "This run kept no table per structure.";
      const role = (r) => r.role === "test" ? "held out" : r.role === "unseen" ? "never used" : "training";
      one = fold("pcurve", "Force error during training", sumCurve, `<div class="cbox" id="pcurve"></div>`) +
        fold("psets", "Error of each data set", sumSets, `<div class="cbox" id="psets"></div>`) +
        fold("psize", "Error against the size of the forces", sumSize, withSide("psize", "struct")) +
        fold("prows", "Every structure, as a table", `${RUN.rows.length} structures with their DFT force, force error and energy error.`, `<table class="grid"><thead><tr><th>Data set</th><th>Structure</th><th>Seen in</th><th>DFT force RMS (meV/Å)</th><th>Force error (meV/Å)</th><th>(%)</th><th>Energy error (meV/atom)</th></tr></thead><tbody>
          ${RUN.rows.map((r) => `<tr><td>${esc(r.set)}</td><td class="num">${esc(r.structure)}</td><td>${role(r)}</td><td class="num">${fmt(r.dft_rms, 0)}</td><td class="num">${fmt(r.force)}</td><td class="num">${fmt(r.pct)}</td><td class="num">${fmt(r.energy)}</td></tr>`).join("") || "<tr><td>This run kept no table per structure.</td></tr>"}</tbody></table>`);
    } else if (runSel) one = `<p class="empty">Reading ${esc(runSel)}</p>`;
    const woCols = canWo(runs), stCol = runs.some((r) => r.stress != null);
    return tiles + explainBox("potential", runs, `The ${of}models, one by one`) + `<div id="psel">${selectionBar(runs)}</div>` + group(`Comparing the ${of}runs`, "Force error on structures the model did not see, as % of the DFT force RMS of those structures. Quote this one, not the training error." + switcher,
        fold("prank", "Which runs are best", sumRank, withSide("prank", "model")) +
        fold("ptime", "What the accuracy costs in training time", sumTime, withSide("ptime", "model")) +
        fold("pall", "All runs, as a table", `${runs.length} runs, ${held.length} of them with held-out structures.`, `<table class="grid"><thead><tr><th>Select</th><th>Run</th><th>Held-out (%)</th>${woCols ? "<th>Without the hardest (%)</th><th>Hardest held-out structure (%)</th>" : ""}<th>Training (%)</th>${stCol ? "<th>Stress error (GPa)</th>" : ""}<th>Split</th><th>Time (s)</th></tr></thead><tbody>
          ${shown.map((r) => `<tr><td><input type="checkbox" data-choose="${esc(r.name)}" ${chosen.has(r.name) ? "checked" : ""} aria-label="Select ${esc(r.name)}"></td><td><button class="link" data-prun="${esc(r.name)}" aria-current="${r.name === runSel}">${esc(r.name)}</button>${saysHTML(r)}</td><td class="num">${r.test == null ? "none held out" : fmt(r.test)}</td>${woCols ? `<td class="num">${fmt(r.test_wo)}</td><td class="num">${r.hardest ? `${esc(r.hardest.structure)}: ${fmt(r.hardest.pct)}` : ""}</td>` : ""}<td class="num">${fmt(r.train)}</td>${stCol ? `<td class="num">${fmt(r.stress)}</td>` : ""}<td class="num">${esc(r.split || "")}</td><td class="num">${r.seconds == null ? "" : Math.round(r.seconds)}</td></tr>`).join("")}
          </tbody></table>${runs.length > 25 ? `<p><button class="link" id="pall">${showAll ? "Show the best 25 only" : "Show all " + runs.length + " runs"}</button></p>` : ""}`)) +
      `<div id="pdetail">` + group(`One ${of}run`, `<label class="field" style="margin:0;max-width:420px">Run (best held-out error first)<select id="prunsel"><option value="">choose a run</option>${runs.slice(0, 80).map((r) => `<option value="${esc(r.name)}" ${r.name === runSel ? "selected" : ""}>${esc(named(r))}</option>`).join("")}</select></label>`, one) + `</div>`;
  }
  function potentialDraw() {
    const rank = host.querySelector("#prank"), runs = byVal(elRuns()).filter((r) => val(r) != null), wo = metric === "wo" && canWo(runs);
    const how = wo ? "Held-out force error without the hardest held-out structure" : "Held-out force error";
    if (rank) {
      bars(rank, { label: how + " of the best runs", unit: "%", note: how + " in % of the DFT force RMS; the 12 best runs. Click a bar for the details of that model.", pick: "model", picked: sel.model,
        items: runs.slice(0, 12).map((r) => ({ key: r.name, label: r.name, hint: says(r), value: val(r), color: r.name === sel.model ? "var(--ink)" : "var(--c3)" })) });
      scatter(host.querySelector("#ptime"), { label: "Training time against " + how.toLowerCase(), logx: true, logy: true, xlabel: "Training time (s), logarithmic", xunit: "s", unit: "%",
        ylabel: how + " in %, logarithmic. Click a point for the details of that model.", pick: "model", picked: sel.model,
        series: [{ name: "runs", color: "var(--c1)", points: runs.filter((r) => r.seconds).map((r) => ({ key: r.name, x: r.seconds, y: val(r), label: named(r) })) }] });
      host.querySelectorAll('[data-side="model"]').forEach((a) => { a.innerHTML = modelSide(); });
    }
    if (!host.querySelector("#pcurve") || !RUN) return;
    const sets = [...new Set(RUN.rows.map((r) => r.set).filter(Boolean))], mean = (set, role) => { const v = RUN.rows.filter((r) => r.set === set && r.pct != null && (role === "test" ? r.role === "test" : r.role !== "test" && r.role !== "unseen")).map((r) => r.pct); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
    const role = (r) => r.role === "test" ? "held out" : r.role === "unseen" ? "never used" : "training";
    chart(host.querySelector("#pcurve"), { label: "Force error against training step", xlabel: "Training step", ylabel: "Force error in meV/Å, logarithmic axis", unit: "meV/Å", log: true, empty: "This run has no log with a training curve.",
      series: [{ name: "training structures", color: "var(--c1)", points: RUN.curve.map((p) => ({ x: p.step, y: p.train })) }, { name: "held-out structures", color: "var(--c2)", points: RUN.curve.map((p) => ({ x: p.step, y: p.test })) }] });
    bars(host.querySelector("#psets"), { label: "Force error of each data set", unit: "%", note: "Mean force error in % of the DFT force RMS. Blue: structures used for training. Orange: structures held out.", empty: "This run kept no table per structure.",
      items: sets.flatMap((x) => [{ label: x + ", training", value: mean(x, "train"), color: "var(--c1)" }, { label: x + ", held out", value: mean(x, "test"), color: "var(--c2)" }]) });
    scatter(host.querySelector("#psize"), { label: "Force error against the size of the forces", logx: true, logy: true, xlabel: "DFT force RMS of the structure (meV/Å), logarithmic", xunit: "meV/Å", unit: "%",
      ylabel: "Force error in % of the DFT force RMS, logarithmic. One point per structure; click one for its numbers.", empty: "This run kept no table per structure.", pick: "struct", picked: sel.struct,
      series: [["training", "var(--c1)"], ["held out", "var(--c2)"], ["never used", "var(--c3)"]].map(([n, c]) => ({ name: n, color: c, points: RUN.rows.filter((r) => role(r) === n).map((r) => ({ key: `${r.set} ${r.structure}`, x: r.dft_rms, y: r.pct, label: `${r.set} ${r.structure}` })) })) });
    host.querySelectorAll('[data-side="struct"]').forEach((a) => { a.innerHTML = structSide(); });
  }
  function modelSide() {
    const runs = byVal(elRuns()), r = runs.find((x) => x.name === sel.model);
    if (!r) return `<p class="hint">Click a bar or a point to see that model here.</p>`;
    const held = runs.filter((x) => val(x) != null), place = held.indexOf(r), kr = DATA.kappa.filter((k) => potOf(k.source) === r);
    const near = (k) => (k.conv || []).reduce((a, b) => !a || Math.abs(b.T - 300) < Math.abs(a.T - 300) ? b : a, null);
    const kfacts = kr.filter(near).map((k) => [`κ at ${fmt(near(k).T, 0)} K, ${FIT[k.method] || "ShengBTE"}`, `${fmt(near(k).k)} W/(m K)`]);
    return `<h4>${esc(r.name)}</h4>${piecesHTML(r)}${r.brief ? `<p class="brief">${esc(r.brief)}</p>` : ""}` +
      facts([["Held-out error", r.test == null ? "none held out" : fmt(r.test) + " %"], ["Without the hardest", r.test_wo == null ? "" : fmt(r.test_wo) + " %"],
        ["Hardest held-out", r.hardest ? `${r.hardest.structure}, ${fmt(r.hardest.pct)} %` : ""], ["Training error", r.train == null ? "" : fmt(r.train) + " %"],
        ["Stress error", r.stress == null ? "" : fmt(r.stress) + " GPa on the held-out structures"], ["Held-out structures", r.common_test ? "the same for every model of this family" : ""],
        ["Training time", r.seconds == null ? "" : Math.round(r.seconds) + " s"], ["Place", place < 0 ? "" : `${place + 1} of ${held.length}`]].concat(kfacts)) +
      aboutHTML(r.about, true) + `<p>${kr.length ? `<button class="plain" data-tokappa="${esc(kr[0].id)}">See its conductivity</button> ` : ""}<button class="solid" data-choosebtn="${esc(r.name)}">${chosen.has(r.name) ? "Remove from the selection" : "Add to the selection"}</button> <button class="plain" data-prun="${esc(r.name)}">See the graphs of this run</button> <button class="link" data-act="open" data-what="potential" data-id="${esc(r.name)}">Open its folder</button> ${clear("model")}</p>`;
  }
  function structSide() {
    const r = RUN && RUN.rows.find((x) => `${x.set} ${x.structure}` === sel.struct);
    if (!r) return `<p class="hint">Click a point to see that structure here.</p>`;
    return `<h4>${esc(r.set)} ${esc(r.structure)}</h4>` + facts([["Used for", r.role === "test" ? "checking (held out)" : r.role === "unseen" ? "nothing (never used)" : "training"],
      ["DFT force RMS", fmt(r.dft_rms, 0) + " meV/Å"], ["Force error", fmt(r.force) + " meV/Å"], ["Force error", fmt(r.pct) + " %"], ["Energy error", r.energy == null ? "" : fmt(r.energy) + " meV/atom"]]) + `<p>${clear("struct")}</p>`;
  }

  /* Collected VASP calculations: one section per material, one group per set, never two materials together. */
  const vSets = () => (DATA.vasp || []).filter((x) => (x.material || "") === vMat);
  const vRead = (x) => x.jobs.filter((j) => j.from);
  function vaspView() {
    const all = DATA.vasp || [];
    if (!all.length) return `<p class="empty">No collected VASP calculation was found on this computer. Give the folders that hold the calculation folders in the local settings (results, vasp), or collect the results from the cluster first.</p>`;
    const mats = sections(all, "material");
    if (vMat == null || !mats.some((g) => g.id === vMat)) vMat = all.slice().sort((a, b) => (b.modified || 0) - (a.modified || 0))[0].material || "";
    const tiles = `<div class="places">${mats.map((g) => { const n = g.runs.reduce((a, x) => a + x.jobs.length, 0);
      return `<button class="place" data-vmat="${esc(g.id)}" aria-pressed="${g.id === vMat}"><b>${esc(g.id || "Material not known")}${newTag("v:" + g.id)}<em>${g.runs.length}</em></b><span>${g.runs.length === 1 ? "set" : "sets"}, ${n} calculations</span></button>`; }).join("")}</div>`;
    const words = explain ? `<section class="panel explain"><h3>Words used here</h3><dl class="words">${WORDS.vasp.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl></section>` : "";
    return tiles + words + vSets().map((x, i) => {
      const J = vRead(x), e = J.map((j) => j.per_atom).filter((v) => v != null), f = J.filter((j) => j.fmax != null), r = J.map((j) => j.frms).filter((v) => v != null);
      const top = f.slice().sort((a, b) => b.fmax - a.fmax)[0], open_ = J.filter((j) => !j.ended), skipped = x.jobs.filter((j) => !j.from), by = launchedBy("vasp", x.id);
      const sumF = r.length ? `Force RMS ${span(r)} eV/\u00c5 per component.${top ? ` The largest force on one atom is ${fmt(top.fmax)} eV/\u00c5, in ${top.job}.` : ""}` : "These calculations hold no forces.";
      const lo = Math.min(...e), hi = Math.max(...e);
      const sumE = e.length ? `From ${lo.toFixed(4)} to ${hi.toFixed(4)} eV per atom: a spread of ${fmt((hi - lo) * 1000)} meV per atom.` : "These calculations hold no energy.";
      const sumT = `${x.ended} of ${x.jobs.length} calculations ended${x.atoms.length ? `, ${x.atoms.join(" or ")} atoms each` : ""}.${x.core_hours ? ` ${Math.round(x.core_hours)} core hours in all.` : ""}`;
      const lead = `${esc(sumT)} <span class="mono">${esc(x.folder)}</span> <button class="link" data-act="open" data-what="vasp" data-id="${esc(x.id)}">Open its folder</button>${by ? ` <span class="says" style="display:inline">sent from Command Room, ${esc(day(by.started))}</span>` : ""}` +
        (open_.length ? `<p class="callout bad">${open_.length} calculation${open_.length === 1 ? " did" : "s did"} not end: ${esc(open_.map((j) => j.job).join(", "))}. Do not use ${open_.length === 1 ? "it" : "them"}.</p>` : "") +
        (skipped.length ? `<p class="callout">${skipped.length} not read: ${esc(skipped[0].skipped || "")}.</p>` : "");
      const num = (v, d) => v == null ? "" : d == null ? fmt(v) : v.toFixed(d);
      return group(`${x.name}${fresh.has("vs:" + x.id) ? " (new)" : ""}`, lead, fold("vf" + i, "Forces in each structure", sumF, withSide("vf" + i, "vjob")) + fold("ve" + i, "Energy of each structure", sumE, withSide("ve" + i, "vjob")) +
        fold("vt" + i, "Every calculation, as a table", sumT, `<table class="grid"><thead><tr><th>Calculation</th><th>Atoms</th><th>Energy per atom (eV)</th><th>Largest force (eV/\u00c5)</th><th>Force RMS (eV/\u00c5)</th><th>Pressure (kB)</th><th>Time (min)</th><th>Cores</th><th>Ended</th><th>Read from</th></tr></thead><tbody>
          ${x.jobs.map((j) => `<tr><td class="num">${esc(j.job)}</td><td class="num">${j.atoms || ""}</td><td class="num">${num(j.per_atom, 4)}</td><td class="num">${num(j.fmax)}</td><td class="num">${num(j.frms)}</td><td class="num">${num(j.pressure)}</td><td class="num">${j.seconds ? Math.round(j.seconds / 60) : ""}</td><td class="num">${j.cores || ""}</td><td>${j.from ? (j.ended ? "yes" : "no") : ""}</td><td>${esc(j.from || "not read")}</td></tr>`).join("")}</tbody></table>`));
    }).join("");
  }
  function vaspDraw() {
    vSets().forEach((x, i) => {
      const J = vRead(x), key = (j) => x.id + "|" + j.job, pts = (k) => J.map((j, n) => ({ key: key(j), x: n + 1, y: j[k], label: j.job })).filter((q) => q.y != null);
      const fbox = host.querySelector("#vf" + i), ebox = host.querySelector("#ve" + i);
      if (fbox) scatter(fbox, { label: "Forces in each structure of " + x.name, xlabel: "Calculation, in the order of its folder name", xwhole: true, unit: "eV/\u00c5", ylabel: "Force in eV/\u00c5. Click a point for the numbers of that calculation.", pick: "vjob", picked: sel.vjob,
        series: [{ name: "force RMS, per component", color: "var(--c1)", points: pts("frms") }, { name: "largest force on one atom", color: "var(--c2)", points: pts("fmax") }] });
      const e = J.map((j) => j.per_atom).filter((v) => v != null), lo = e.length ? Math.min(...e) : 0;
      if (ebox) scatter(ebox, { label: "Energy of each structure of " + x.name, xlabel: "Calculation, in the order of its folder name", xwhole: true, unit: "meV per atom", ylabel: "Energy above the lowest of the set, in meV per atom. Click a point for the numbers of that calculation.", pick: "vjob", picked: sel.vjob,
        series: [{ name: "energy", color: "var(--c3)", points: J.filter((j) => j.per_atom != null).map((j, n) => ({ key: key(j), x: J.indexOf(j) + 1, y: (j.per_atom - lo) * 1000, label: j.job })) }] });
      for (const box of [fbox, ebox]) { const side = box && box.parentElement.querySelector('[data-side="vjob"]'); if (side) side.innerHTML = vjobSide(x); }
    });
  }
  function vjobSide(x) {
    const j = sel.vjob && sel.vjob.startsWith(x.id + "|") ? x.jobs.find((q) => x.id + "|" + q.job === sel.vjob) : null;
    if (!j) return `<p class="hint">Click a point to see that calculation here.</p>`;
    return `<h4>${esc(x.name)} ${esc(j.job)}</h4>` + facts([["Atoms", j.atoms], ["Energy", j.energy == null ? "" : j.energy.toFixed(4) + " eV"], ["Energy per atom", j.per_atom == null ? "" : j.per_atom.toFixed(4) + " eV"],
      ["Largest force", j.fmax == null ? "" : fmt(j.fmax) + " eV/\u00c5"], ["Force RMS", j.frms == null ? "" : fmt(j.frms) + " eV/\u00c5 per component"], ["Pressure", j.pressure == null ? "" : fmt(j.pressure) + " kB"],
      ["Volume", j.volume == null ? "" : fmt(j.volume) + " \u00c5\u00b3"], ["Plane-wave cutoff", j.encut == null ? "" : fmt(j.encut, 0) + " eV"], ["Time", j.seconds ? Math.round(j.seconds / 60) + " min on " + (j.cores || "?") + " cores" : ""],
      ["Ended", j.ended ? "yes" : "no: do not use it"], ["Read from", j.from]]) + `<p><button class="link" data-act="open" data-what="vasp" data-id="${esc(x.id)}">Open the folder of the set</button> ${clear("vjob")}</p>`;
  }
  /* Open Results on one result (used by the pipeline): the right section, the right material, the result picked. */
  function applyFocus() {
    if (!want || !DATA) return;
    const { kind, key } = want; want = null;
    if (kind === "kappa") { tab = "kappa"; const r = DATA.kappa.find((x) => x.id === key); if (r) { matSel = r.material || ""; off.delete(r.id); } sel.kappa = key; open.add("ka"); open.add("kl"); }
    else if (kind === "potential") { tab = "potential"; const r = DATA.potentials.find((x) => x.name === key); if (r) elSel = r.element || ""; sel.model = key; open.add("prank"); }
    else if (kind === "vasp") { tab = "vasp"; const x = (DATA.vasp || []).find((v) => v.id === key); if (x) { vMat = x.material || ""; const i = vSets().indexOf(x); open.add("vf" + i); open.add("vt" + i); } }
  }
  function focus(kind, key) { want = { kind, key }; applyFocus(); }
  function paint() {
    host.innerHTML = `<div class="area"><h1>Results</h1><div class="rhead"><div class="seg"><button aria-pressed="${tab === "kappa"}" data-rtab="kappa">Thermal conductivity</button><button aria-pressed="${tab === "potential"}" data-rtab="potential">Potentials</button><button aria-pressed="${tab === "vasp"}" data-rtab="vasp">Calculations</button></div>
      <button class="plain" data-explain aria-pressed="${explain}">${explain ? "Hide the explanations" : "What do these mean?"}</button></div>
      <p class="lead" style="margin-top:12px">${tab === "kappa" ? "ShengBTE runs found in the result folders on this computer, one section per material." : tab === "vasp" ? "VASP calculations collected on this computer, one section per material and one group per set." : "Training runs of the potentials found on this computer, one section per element: potentials of different elements are not compared."} Each section says its conclusion; open it to see the graph.</p>
      ${tab === "kappa" ? kappaView() : tab === "vasp" ? vaspView() : potentialView()}</div>`;
    if (tab === "kappa") kappaDraw(); else if (tab === "vasp") vaspDraw(); else potentialDraw();
  }
  async function pickRun(name) {
    runSel = name || null; RUN = null; sel.struct = null; paint();
    if (!runSel) return;
    RUN = await currentGet("/api/results/run?name=" + encodeURIComponent(runSel));
    paint();
    const d = host.querySelector("#pdetail"); if (d) d.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  let currentGet = null;
  async function render(el, get) {
    host = el; currentGet = get;
    if (!DATA) { host.innerHTML = '<div class="area"><h1>Results</h1><p class="lead">Reading the result files</p></div>'; DATA = await get("/api/results"); }
    if (!LAUNCH) { try { LAUNCH = await get("/api/launchers"); } catch (e) { LAUNCH = { launchers: [] }; } }
    applyFocus();
    paint();
    if (!host.dataset.wired) {
      host.dataset.wired = "1";
      host.addEventListener("click", (e) => {
        if (!host.querySelector("[data-rtab]")) return;
        const f = e.target.closest("[data-foldbtn]"), t = e.target.closest("[data-rtab]"), p = e.target.closest("[data-prun]"), pe = e.target.closest("[data-pel]"), km = e.target.closest("[data-kmat]");
        const pk = e.target.closest("[data-pick]"), up = e.target.closest("[data-unpick]");
        const cb = e.target.closest("[data-choosebtn]"), uc = e.target.closest("[data-unchoose]"), st = e.target.closest("[data-sendto]");
        const ks = e.target.closest("[data-kshow]"), tp = e.target.closest("[data-topot]"), tk = e.target.closest("[data-tokappa]"), vm = e.target.closest("[data-vmat]");
        if (ks) { sel.kappa = ks.dataset.kshow; off.delete(sel.kappa); open.add("ka"); paint(); const box = host.querySelector("#ka"); if (box) box.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
        if (tp) { focus("potential", tp.dataset.topot); paint(); return; }
        if (tk) { focus("kappa", tk.dataset.tokappa); paint(); return; }
        if (vm) { vMat = vm.dataset.vmat; fresh.delete("v:" + vMat); sel.vjob = null; paint(); return; }
        if (cb) { toggleChosen(cb.dataset.choosebtn); paint(); return; }
        if (uc) { chosen.delete(uc.dataset.unchoose); keepChosen(); paint(); return; }
        if (e.target.closest("[data-clearchosen]")) { chosen.clear(); keepChosen(); paint(); return; }
        if (st) { const names = elRuns().map((r) => r.name).filter((n) => chosen.has(n)); if (window.CRLaunch) window.CRLaunch(st.dataset.sendto, { models: names.join(" ") }); return; }
        if (pk) { const box = pk.closest("[data-kind]"); if (box) choose(box.dataset.kind, pk.dataset.pick); return; }
        if (up) { choose(up.dataset.unpick, sel[up.dataset.unpick]); return; }
        if (e.target.closest("[data-explain]")) { explain = !explain; try { localStorage.setItem("cr-explain", explain ? "1" : "0"); } catch (err) { /* private mode */ } paint(); return; }
        if (e.target.closest("[data-allmodels]")) { allModels = !allModels; paint(); return; }
        const pm = e.target.closest("[data-pmetric]");
        if (pm) { metric = pm.dataset.pmetric === "wo" ? "wo" : "all"; try { localStorage.setItem("cr-metric", metric); } catch (err) { /* private mode */ } paint(); return; }
        if (f) { const id = f.dataset.foldbtn, sec = f.closest(".fold"), on = !open.has(id); if (on) open.add(id); else open.delete(id);
          sec.classList.toggle("open", on); sec.querySelector(".foldbody").hidden = !on; f.textContent = on ? "Close" : "Open"; f.setAttribute("aria-expanded", on); }
        else if (t) { tab = t.dataset.rtab; paint(); }
        else if (pe) { elSel = pe.dataset.pel; fresh.delete("p:" + elSel); runSel = null; RUN = null; showAll = false; allModels = false; sel.model = null; sel.struct = null; paint(); }
        else if (km) { matSel = km.dataset.kmat; fresh.delete("k:" + matSel); sel.kappa = null; paint(); }
        else if (p) pickRun(p.dataset.prun);
        else if (e.target.id === "pall") { showAll = !showAll; paint(); }
      });
      host.addEventListener("keydown", (e) => { const pk = e.target.closest && e.target.closest("[data-pick][role=button]");
        if (pk && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); const box = pk.closest("[data-kind]"); if (box) choose(box.dataset.kind, pk.dataset.pick); } });
      host.addEventListener("change", (e) => {
        if (e.target.id === "kref") { refSource = e.target.value; paint(); }
        else if (e.target.id === "kwhich") { which = e.target.value; paint(); }
        else if (e.target.dataset.choose) { toggleChosen(e.target.dataset.choose); const bar = host.querySelector("#psel"); if (bar) bar.innerHTML = selectionBar(byVal(elRuns())); }
        else if (e.target.id === "prunsel") pickRun(e.target.value);
        else if (e.target.dataset.run) { if (e.target.checked) off.delete(e.target.dataset.run); else off.add(e.target.dataset.run); paint(); }
      });
    }
  }
  /* Read the result files again. Returns the sections and the results that were not there before. */
  const keys = (d) => new Set([...d.potentials.map((r) => "p:" + (r.element || "")), ...d.kappa.map((r) => "k:" + (r.material || "")), ...(d.vasp || []).map((x) => "v:" + (x.material || ""))]);
  const names = (d) => new Set([...d.potentials.map((r) => r.name), ...d.kappa.map((r) => r.id), ...(d.vasp || []).map((x) => "calculations " + x.id)]);
  async function refresh(get) {
    const next = await get("/api/results");
    if (!DATA) { DATA = next; return { sections: [], runs: [] }; }
    const before = keys(DATA), had = names(DATA), added = [...keys(next)].filter((k) => !before.has(k)), runs = [...names(next)].filter((n) => !had.has(n));
    DATA = next; added.forEach((k) => fresh.add(k)); applyFocus();
    if (host && host.isConnected && host.querySelector("[data-rtab]")) paint();
    return { sections: added.map((k) => (k.slice(2) || "not known") + (k[0] === "p" ? " potentials" : k[0] === "v" ? " calculations" : " thermal conductivity")), runs };
  }
  return { render, refresh, focus, reload: () => { DATA = null; } };
})();

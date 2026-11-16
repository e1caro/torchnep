/* Shared logic of the two visual directions: reads window.SNAPSHOT (snapshot.local.js, git-ignored) and
   derives the lanes of the board, the "what to launch now" list and the state of the local jobs.
   No number is made up here: what the snapshot does not hold is reported as missing. */
window.CR = (function () {
  const S = window.SNAPSHOT || null;
  const STAGES = ["vasp", "training", "shengbte"];
  const STAGE_LABEL = { vasp: "VASP", training: "Training", shengbte: "ShengBTE" };
  const STATE = { faltan: "todo", enviado: "sent", terminado: "done" };
  const STATE_LABEL = { todo: "to do", sent: "sent", done: "done", failed: "failed", attention: "needs attention" };
  const STEP_COMMAND = {
    vasp: "python <tools>/hipipe.py pre --n N --dry-run",
    training: "python <tools>/hipipe.py fit --dry-run",
    shengbte: "python <tools>/hipipe.py bte --dry-run",
  };

  const materialOf = (name) => (S.variantOf && S.variantOf[name]) || name;
  const fmtDate = (t) => {
    const d = typeof t === "number" ? new Date(t * 1000) : new Date(t);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " +
      d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  };

  function lanes() {
    const order = [], byName = {};
    for (const it of S.board.items) {
      const mat = materialOf(it.name);
      if (!byName[mat]) { byName[mat] = { name: mat, material: mat, variant: false, cells: {} }; order.push(byName[mat]); }
    }
    for (const it of S.board.items) {
      const mat = materialOf(it.name);
      let lane = byName[it.name];
      if (!lane) {
        lane = byName[it.name] = { name: it.name, material: mat, variant: true, cells: {} };
        order.splice(order.indexOf(byName[mat]) + 1 + order.filter((l) => l.variant && l.material === mat).length, 0, lane);
      }
      lane.cells[it.stage] = it;
    }
    for (const l of order) l.polar = (S.polar || []).includes(l.material);
    return order;
  }

  function verdict(it, all) {
    const mat = materialOf(it.name), i = STAGES.indexOf(it.stage);
    const polar = (S.polar || []).includes(mat);
    const v = { item: it, material: mat, polar, kind: "ready", reason: "", command: STEP_COMMAND[it.stage] };
    if (i === 0) { v.reason = "First stage: nothing has to finish before it."; return v; }
    const prevStage = STAGES[i - 1];
    const same = all.find((x) => x.stage === prevStage && x.name === it.name);
    const base = all.find((x) => x.stage === prevStage && x.name === mat);
    const prev = same || base;
    if (!prev) {
      v.kind = "attention"; v.command = "";
      v.reason = `The board has no ${STAGE_LABEL[prevStage]} row for ${mat}.`;
    } else if (STATE[prev.status] !== "done") {
      v.kind = "waiting"; v.command = "";
      v.reason = `Waits for ${STAGE_LABEL[prevStage]} of ${prev.name} (${STATE_LABEL[STATE[prev.status]]}).`;
    } else if (!same && it.name !== mat) {
      v.kind = "attention";
      v.reason = `${STAGE_LABEL[prevStage]} of ${mat} is done, but the board has no ${STAGE_LABEL[prevStage]} row ` +
        `called "${it.name}". Check on the cluster that this variant's fit exists before launching.`;
    } else {
      v.reason = `${STAGE_LABEL[prevStage]} of ${prev.name} is done (board, ${fmtDate(prev.updated)}).`;
    }
    if (polar && it.stage !== "vasp") {
      v.reason += it.stage === "training"
        ? " Polar: needs the Born-charge run and --lr in the fit."
        : " Polar: needs polar = yes and Born charges in CONTROL.";
    }
    return v;
  }

  function next() {
    const all = S.board.items;
    const rank = { ready: 0, attention: 1, waiting: 2 };
    return all.filter((it) => STATE[it.status] === "todo").map((it) => verdict(it, all))
      .sort((a, b) => rank[a.kind] - rank[b.kind]);
  }

  function localJobs() {
    const jobs = S.localJobs || [];
    const running = jobs.filter((j) => j.state === "running");
    const last = jobs.length ? jobs[jobs.length - 1] : null;
    return { running, last };
  }

  const GLYPH = {
    done: '<circle cx="8" cy="8" r="6.5" fill="currentColor"/><path d="M4.8 8.2l2.2 2.2 4.2-4.6" fill="none" stroke="var(--glyph-ink)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
    sent: '<circle cx="8" cy="8" r="5.8" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="8" cy="8" r="2.6" fill="currentColor"/>',
    todo: '<circle cx="8" cy="8" r="5.8" fill="var(--glyph-hole)" stroke="currentColor" stroke-width="1.8"/>',
    failed: '<circle cx="8" cy="8" r="6.5" fill="currentColor"/><path d="M5.3 5.3l5.4 5.4M10.7 5.3l-5.4 5.4" stroke="var(--glyph-ink)" stroke-width="1.8" stroke-linecap="round"/>',
    attention: '<path d="M8 1.6l6.6 12H1.4z" fill="currentColor"/><path d="M8 6v3.6M8 11.6v.4" stroke="var(--glyph-ink)" stroke-width="1.8" stroke-linecap="round"/>',
    off: '<circle cx="8" cy="8" r="5.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2.4 2.4"/>',
  };
  const glyph = (state, size) =>
    `<svg class="glyph st-${state}" width="${size || 16}" height="${size || 16}" viewBox="0 0 16 16" aria-hidden="true">${GLYPH[state]}</svg>`;

  /* Training curve: force error against step, logarithmic axis, two series, hover and table view. */
  function curve(host, run) {
    const P = run.points, W = 560, H = 230, m = { l: 46, r: 64, t: 14, b: 30 };
    const xs = P.map((p) => p.step), all = P.flatMap((p) => [p.trainF, p.testF]);
    const x0 = 0, x1 = Math.max(...xs), lo = Math.log10(Math.min(...all)), hi = Math.log10(Math.max(...all));
    const y0 = Math.floor(lo * 2) / 2, y1 = Math.ceil(hi * 2) / 2;
    const X = (v) => m.l + ((v - x0) / (x1 - x0)) * (W - m.l - m.r);
    const Y = (v) => m.t + (1 - (Math.log10(v) - y0) / (y1 - y0)) * (H - m.t - m.b);
    const path = (k) => P.map((p, i) => (i ? "L" : "M") + X(p.step).toFixed(1) + " " + Y(p[k]).toFixed(1)).join(" ");
    const ticks = [];
    for (let e = Math.ceil(y0); e <= Math.floor(y1); e++) ticks.push(Math.pow(10, e));
    const lb = P.findIndex((p) => p.phase === "L-BFGS"), split = lb > 0 ? P[lb - 1].step : null;
    const end = P[P.length - 1];
    const xt = [0, x1 / 2, x1].map(Math.round);
    host.innerHTML = `
      <div class="chart-legend"><span><i class="sw sw-train"></i>training structures</span><span><i class="sw sw-test"></i>held-out structures</span>
        <button type="button" class="chart-toggle" aria-pressed="false">Show as table</button></div>
      <div class="chart-wrap">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Force error of ${run.name} against training step">
        ${ticks.map((t) => `<line class="grid" x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}"/><text class="tick" x="${m.l - 8}" y="${Y(t) + 4}" text-anchor="end">${t}</text>`).join("")}
        ${xt.map((t) => `<text class="tick" x="${X(t)}" y="${H - 10}" text-anchor="middle">${t}</text>`).join("")}
        <line class="axis" x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}"/>
        ${split !== null ? `<line class="split" x1="${X(split)}" x2="${X(split)}" y1="${m.t}" y2="${H - m.b}"/><text class="tick" x="${X(split) + 6}" y="${m.t + 10}">L-BFGS starts</text>` : ""}
        <path class="line line-train" d="${path("trainF")}"/><path class="line line-test" d="${path("testF")}"/>
        ${P.map((p) => `<circle class="dot dot-train" cx="${X(p.step)}" cy="${Y(p.trainF)}" r="4"/><circle class="dot dot-test" cx="${X(p.step)}" cy="${Y(p.testF)}" r="4"/>`).join("")}
        <text class="endlabel" x="${X(end.step) + 9}" y="${Y(end.trainF) + 4}">${end.trainF}</text>
        <text class="endlabel" x="${X(end.step) + 9}" y="${Y(end.testF) + 4}">${end.testF}</text>
        <line class="cross" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>
        <rect class="hit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/>
      </svg><div class="chart-tip" hidden></div></div>
      <p class="chart-axis">Force error in meV/Å (logarithmic) against training step</p>
      <table class="chart-table" hidden><thead><tr><th>step</th><th>phase</th><th>training, meV/Å</th><th>held-out, meV/Å</th></tr></thead>
        <tbody>${P.map((p) => `<tr><td>${p.step}</td><td>${p.phase}</td><td>${p.trainF}</td><td>${p.testF}</td></tr>`).join("")}</tbody></table>`;
    const svg = host.querySelector("svg"), tip = host.querySelector(".chart-tip"), cross = host.querySelector(".cross");
    const show = (i) => {
      const p = P[i], px = X(p.step);
      cross.setAttribute("x1", px); cross.setAttribute("x2", px); cross.setAttribute("visibility", "visible");
      tip.hidden = false;
      tip.innerHTML = `<b>step ${p.step}</b> ${p.phase}<br><i class="sw sw-train"></i>${p.trainF} meV/Å<br><i class="sw sw-test"></i>${p.testF} meV/Å`;
      tip.style.left = Math.min(72, Math.max(4, (px / W) * 100)) + "%";
    };
    host.querySelector(".hit").addEventListener("mousemove", (e) => {
      const r = svg.getBoundingClientRect(), vx = ((e.clientX - r.left) / r.width) * W;
      let best = 0; P.forEach((p, i) => { if (Math.abs(X(p.step) - vx) < Math.abs(X(P[best].step) - vx)) best = i; });
      show(best);
    });
    host.querySelector(".hit").addEventListener("mouseleave", () => { tip.hidden = true; cross.setAttribute("visibility", "hidden"); });
    const btn = host.querySelector(".chart-toggle"), table = host.querySelector(".chart-table"), wrap = host.querySelector(".chart-wrap");
    btn.addEventListener("click", () => {
      const on = table.hidden; table.hidden = !on; wrap.hidden = on;
      btn.setAttribute("aria-pressed", on); btn.textContent = on ? "Show as chart" : "Show as table";
    });
  }

  function theme(button) {
    const root = document.documentElement;
    const set = (t) => { root.dataset.theme = t; button.textContent = t === "dark" ? "Light theme" : "Dark theme"; };
    set(root.dataset.theme || "dark");
    button.addEventListener("click", () => set(root.dataset.theme === "dark" ? "light" : "dark"));
  }

  return { S, STAGES, STAGE_LABEL, STATE, STATE_LABEL, materialOf, fmtDate, lanes, next, localJobs, glyph, curve, theme };
})();

/* Command Room interface. It draws only what the local server reads; what is missing is said, never invented.
   Each area shows one thing and nothing that another area already shows:
   Overview = the pipeline and its rows; Launch = sending a step; Jobs = what is running; Results; Reports; Library. */
(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const AREAS = [["overview", "Overview"], ["launch", "Launch"], ["jobs", "Jobs"], ["results", "Results"], ["reports", "Reports"], ["library", "Library"]];
  const WORD = { todo: "ready to launch", sent: "sent", done: "done", failed: "failed", attention: "check first", waiting: "waiting" };
  const PLAIN = { todo: "to do", sent: "sent", done: "done", failed: "failed" };
  const GLYPH = {
    done: '<svg viewBox="0 0 16 16"><path d="M3.6 8.4l2.9 2.9 5.9-6.4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    failed: '<svg viewBox="0 0 16 16"><path d="M4.2 4.2l7.6 7.6M11.8 4.2l-7.6 7.6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    sent: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="4" fill="currentColor"/></svg>',
    attention: '<svg viewBox="0 0 30 30"><path d="M15 3.5l12.5 22h-25z" fill="currentColor"/><path d="M15 12v7M15 22v.6" stroke="var(--on)" stroke-width="2.6" stroke-linecap="round"/></svg>',
    todo: "", waiting: "",
  };
  const ICON = {
    x: '<svg viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    left: '<svg viewBox="0 0 12 12"><path d="M7.5 2L3.5 6l4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    right: '<svg viewBox="0 0 12 12"><path d="M4.5 2l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };
  let S = null, lastKey = "", area = "overview", selected = null, rowSel = null, seen = {}, dirty = false, editing = false, place = null;
  let L = { step: null, options: null, plan: null, result: null, busy: "" };
  let libQuery = "", libPage = null, LIB = null, REP = null, repBusy = "", repAsk = null, lastStamp = null;

  /* ---------- helpers ---------- */
  const clock = (t) => new Date(t * 1000).toLocaleTimeString("en-GB");
  const when = (t) => { if (!t) return "unknown"; const d = typeof t === "number" ? new Date(t * 1000) : new Date(t);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); };
  async function get(path) { return (await fetch(path, { cache: "no-store" })).json(); }
  async function post(path, body) {
    const r = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "the request failed");
    return j;
  }
  let toastTimer = null;
  function toast(text, bad) {
    const t = $("toast"); t.textContent = text; t.className = "toast" + (bad ? " bad" : ""); t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, bad ? 7000 : 3500);
  }
  async function act(fn) {
    try { const r = await fn(); if (r && r.message) toast(r.message); lastKey = ""; await load(true); return r; }
    catch (e) { toast(e.message, true); return null; }
  }
  const change = (op, args) => act(() => post("/api/pipeline", { op, args }));
  const P = () => S.pipeline;
  const stepById = (id) => P().steps.find((s) => s.id === id);
  const stageLabel = (id) => (P().stages.find((s) => s.id === id) || {}).label || id;
  const laneOf = (name) => P().lanes.find((l) => l.name === name);
  const at = (lane, stage) => P().steps.find((s) => s.name === lane && s.stage === stage);
  const badge = (state, text) => `<span class="badge ${state}"><i></i>${esc(text || WORD[state] || state)}</span>`;
  const typing = () => { const a = document.activeElement; return a && $("main").contains(a) && /INPUT|SELECT|TEXTAREA/.test(a.tagName); };
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("drawer").hidden) $("drawer").hidden = true; });
  const running = () => (S.local ? S.local.live.filter((j) => j.state === "running") : []);

  /* ---------- top bar ---------- */
  const root = document.documentElement;
  const setTheme = (t) => { root.dataset.theme = t; $("theme").textContent = t === "dark" ? "Light" : "Dark"; try { localStorage.setItem("cr-theme", t); } catch (e) { /* private mode */ } };
  let savedTheme = "dark"; try { savedTheme = localStorage.getItem("cr-theme") || "dark"; } catch (e) { /* private mode */ }
  setTheme(savedTheme);
  $("theme").addEventListener("click", () => setTheme(root.dataset.theme === "dark" ? "light" : "dark"));
  function tabs() { $("tabs").innerHTML = AREAS.map(([id, label]) => `<a href="#${id}" ${id === area ? 'aria-current="page"' : ""}>${label}</a>`).join(""); }
  function chips() {
    const c = S.clusters.map((x) => { const n = x.jobs ? x.jobs.filter((j) => j.state === "running" || j.state === "queued").length : 0;
      const man = x.mode === "manual", cls = man ? (x.jobs ? (n ? "busy" : "on") : "") : !x.enabled ? "" : x.error ? "bad" : n ? "busy" : "on";
      return `<a class="chip ${cls}" href="#jobs" data-place="${esc(x.id)}" title="${esc(clusterLine(x))}"><i></i>${esc(x.label)}${man ? (x.jobs ? " " + n : " by hand") : x.enabled && x.jobs ? " " + n : !x.enabled ? " off" : ""}</a>`; }).join("");
    const r = running().length;
    $("chips").innerHTML = c + `<a class="chip ${r ? "busy" : S.local ? "on" : ""}" href="#jobs" data-place="local" title="Jobs on this computer"><i></i>this PC ${S.local ? r : "?"}</a>`;
  }
  function go(to) { area = AREAS.some((a) => a[0] === to) ? to : "overview"; if (location.hash.slice(1) !== area) location.hash = area; tabs(); $("main").scrollTo(0, 0); render(true); }
  document.addEventListener("click", (e) => { const c = e.target.closest("a.chip[data-place]"); if (c) { place = c.dataset.place; if (area === "jobs") jobsArea(); } });
  window.addEventListener("hashchange", () => { const h = location.hash.slice(1).split("/")[0]; if (h !== area) go(h); });
  document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("cmd").focus(); $("cmd").select(); } });
  $("cmd").addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || !S) return;
    const q = e.target.value.trim().toLowerCase(); if (!q) return;
    const hit = AREAS.find(([id, label]) => label.toLowerCase().startsWith(q) || id.startsWith(q));
    e.target.value = ""; e.target.blur();
    if (hit) return go(hit[0]);
    const lane = P().lanes.find((l) => l.name.toLowerCase() === q) || P().lanes.find((l) => l.name.toLowerCase().includes(q));
    if (lane) { rowSel = lane.name; const first = P().steps.find((s) => s.name === lane.name); selected = first ? first.id : selected; return go("overview"); }
    if (/\?$/.test(q) || q.split(" ").length > 3) return openAsk(q);
    libQuery = q; libPage = null; go("library");
  });

  /* ---------- assistant: only when asked ---------- */
  let TALK = [], asking = false;
  function talk() {
    $("talk").innerHTML = TALK.map((m) => `<div class="msg ${m.who}"><b>${m.who === "you" ? "You" : m.who === "error" ? "Problem" : "Assistant"}</b><p>${esc(m.text).replace(/\n/g, "<br>")}</p></div>`).join("") + (asking ? '<p class="fine">Thinking</p>' : "");
    $("talk").scrollTop = $("talk").scrollHeight;
  }
  async function ask(q) {
    if (asking || !q.trim()) return;
    TALK.push({ who: "you", text: q.trim() }); asking = true; talk();
    try { const r = await post("/api/assistant", { question: q, step: selected }); TALK.push({ who: "claude", text: r.answer }); }
    catch (e) { TALK.push({ who: "error", text: e.message }); }
    asking = false; talk();
  }
  function openAsk(q) { $("drawer").hidden = false; talk(); const f = $("askform"); if (q) { f.q.value = q; } f.q.focus(); }
  $("askbtn").addEventListener("click", () => { if ($("drawer").hidden) openAsk(""); else $("drawer").hidden = true; });
  $("askclose").addEventListener("click", () => { $("drawer").hidden = true; });
  $("askform").addEventListener("submit", (e) => { e.preventDefault(); const q = e.target.q.value; e.target.q.value = ""; ask(q); });

  /* ---------- overview: the pipeline, the selected step, its row, the board's changes ---------- */
  function draw() {
    const svg = $("tracks"); if (!svg || area !== "overview") return;
    const pos = {}, R = 15; let h = "";
    $("wall").querySelectorAll(".lamp").forEach((b) => { pos[b.dataset.id] = { x: b.offsetLeft + b.offsetWidth / 2, y: b.offsetTop + b.offsetHeight / 2 }; });
    for (const s of P().steps) {
      const b = pos[s.id]; if (!b) continue;
      if (!s.prev) { const lane = laneOf(s.name);
        if (lane && lane.potential) { const ox = b.x - 62; h += `<path class="seg lit" d="M${ox + 9} ${b.y}H${b.x - R}"/><path class="origin" d="M${ox} ${b.y - 7}l7 7-7 7-7-7z"/><text class="otext" x="${ox - 12}" y="${b.y + 4}" text-anchor="end">from a potential</text>`; }
        continue; }
      const p = stepById(s.prev), a = pos[s.prev]; if (!a || !p) continue;
      const cls = p.state === "done" && s.state === "done" ? "lit" : p.state === "done" && (s.kind === "ready" || s.kind === "attention") ? "next" : "dim";
      if (Math.abs(a.y - b.y) < 1) h += `<path class="seg ${cls}" d="M${a.x + R} ${a.y}H${b.x - R}"/>`;
      else { const x1 = a.x + R, x2 = b.x - R, mx = (x1 + x2) / 2; h += `<path class="seg ${cls}" d="M${x1} ${a.y}C${mx} ${a.y} ${mx} ${b.y} ${x2} ${b.y}"/>`; }
    }
    svg.innerHTML = h;
  }
  function overview(full) {
    const p = P(), n = p.stages.length, c = p.counts, run = running().length;
    if (full) {
      $("main").innerHTML = `<div class="hero"><h1 id="status"></h1><div class="stats" id="stats"></div></div>
        <section class="panel mimic" aria-label="Pipeline">
        <div class="head"><h2>Pipeline</h2><button class="plain" id="editbtn" data-act="editmode" aria-pressed="false">Edit</button><div class="key">${["done", "sent", "todo", "attention", "waiting", "failed"].map((k) => `<span><i class="lamp ${k}">${GLYPH[k]}</i>${WORD[k]}</span>`).join("")}</div></div>
        <div class="wallbox"><div class="wallwrap"><svg id="tracks" aria-hidden="true"></svg><div class="wall" id="wall"></div></div></div>
        <p class="notice" id="notice" role="status"></p>
        <div class="editbox" id="editbox" hidden><div class="forms">
          <form id="addStage"><label>New process<input name="label" type="text" required maxlength="24" placeholder="Relaxation"></label>
            <label>Place it<select name="after"></select></label><button class="solid">Add process</button></form>
          <form id="addLane"><label>New material or variant<input name="name" type="text" required maxlength="24" placeholder="GaN"></label>
            <label>Variant of<select name="parent"></select></label><button class="solid">Add row</button></form>
        </div><p class="fine">In the diagram: hover a process or a row to move or remove it, use the + in an empty place to add a step, and click a row's name for its settings.</p></div></section>
        <div class="under"><section class="panel" id="selected"></section><section class="panel" id="rowbox"></section><section class="panel"><h2>Last changes on the board</h2><ul class="feed" id="feed"></ul></section></div>`;
      $("addStage").addEventListener("submit", (e) => { e.preventDefault(); const f = e.target; change("add_stage", { label: f.label.value, after: f.after.value }).then((r) => { if (r) f.label.value = ""; }); });
      $("addLane").addEventListener("submit", (e) => { e.preventDefault(); const f = e.target; change("add_lane", { name: f.name.value, parent: f.parent.value }).then((r) => { if (r) f.name.value = ""; }); });
      new ResizeObserver(draw).observe($("wall"));
    }
    $("status").textContent = !S.board.available && !p.steps.length ? "The work board could not be read" : c.ready ? `${c.ready} step${c.ready === 1 ? " is" : "s are"} ready to launch` : c.attention ? "Nothing is ready until you check a step" : c.waiting ? "Everything open is waiting" : "Nothing is waiting for you";
    $("stats").innerHTML = [["ready", c.ready, "ready to launch"], ["check", c.attention, "to check first"], ["waiting", c.waiting, "waiting"], ["running", run, "running on this PC"]]
      .map(([k, v, t]) => `<button type="button" class="stat ${k} ${v ? "" : "zero"}" data-act="stat" data-id="${k}" title="${k === "running" ? "Open the jobs on this computer" : v ? "Show the first of these steps" : ""}"><b><i></i>${v}</b><span>${t}</span></button>`).join("");
    const wall = $("wall");
    wall.style.gridTemplateColumns = `minmax(170px, 210px) repeat(${n}, minmax(120px, 300px))`;
    let h = '<div class="corner">Material</div>';
    p.stages.forEach((s, i) => { h += `<div class="stagehead"><b>${esc(s.label)}</b><span class="tools">
      <button class="icon" data-act="move" data-dir="left" data-id="${esc(s.id)}" aria-label="Move ${esc(s.label)} left" ${i ? "" : "hidden"}>${ICON.left}</button>
      <button class="icon" data-act="move" data-dir="right" data-id="${esc(s.id)}" aria-label="Move ${esc(s.label)} right" ${i < n - 1 ? "" : "hidden"}>${ICON.right}</button>
      <button class="icon" data-act="dropstage" data-id="${esc(s.id)}" aria-label="Remove the process ${esc(s.label)}">${ICON.x}</button></span></div>`; });
    for (const l of p.lanes) {
      h += `<div class="lanehead ${l.parent ? "variant" : ""}"><button class="lanebtn" data-act="row" data-id="${esc(l.name)}" aria-pressed="false">${esc(l.name)}</button>${!l.parent && l.polar ? "<small>polar</small>" : ""}<span class="tools"><button class="icon" data-act="droplane" data-id="${esc(l.name)}" aria-label="Remove the row ${esc(l.name)}">${ICON.x}</button></span></div>`;
      for (const s of p.stages) {
        const it = at(l.name, s.id);
        if (!it) { h += `<div class="cell"><button class="add" data-act="addstep" data-lane="${esc(l.name)}" data-stage="${esc(s.id)}" aria-label="Add ${esc(s.label)} to ${esc(l.name)}">+</button></div>`; continue; }
        const changed = seen[it.id] && seen[it.id] !== it.view ? " changed" : "";
        h += `<div class="cell"><button class="lamp ${it.view}${changed}" data-act="select" data-id="${esc(it.id)}" aria-pressed="false" title="${esc(s.label)} of ${esc(l.name)}: ${WORD[it.view]}" aria-label="${esc(s.label)} of ${esc(l.name)}: ${WORD[it.view]}">${GLYPH[it.view]}</button></div>`;
      }
    }
    wall.innerHTML = h;
    seen = Object.fromEntries(p.steps.map((s) => [s.id, s.view]));
    const fill = (el, html) => { if (document.activeElement !== el) { const v = el.value; el.innerHTML = html; if ([...el.options].some((o) => o.value === v)) el.value = v; } };
    fill($("addStage").after, `<option value="__end">at the end</option><option value="__start">at the start</option>` + p.stages.map((s) => `<option value="${esc(s.id)}">after ${esc(s.label)}</option>`).join(""));
    fill($("addLane").parent, `<option value="">nothing, it is a material</option>` + p.lanes.filter((l) => !l.parent).map((l) => `<option>${esc(l.name)}</option>`).join(""));
    const hidden = p.hidden.lanes.map((l) => `<button class="link" data-act="showlane" data-id="${esc(l)}">bring back ${esc(l)}</button>`)
      .concat(p.hidden.steps.length ? [`<button class="link" data-act="showsteps">bring back ${p.hidden.steps.length} hidden step${p.hidden.steps.length === 1 ? "" : "s"}</button>`] : [])
      .concat((p.removed || []).map((s) => `<button class="link" data-act="backstage" data-id="${esc(s.label)}">bring back the process ${esc(s.label)}</button>`));
    $("notice").innerHTML = (S.undo ? '<button class="link" data-act="undo">Undo the last change</button>' : "") +
      (S.board.available ? "" : "<span>The work board file is not set or could not be read, so its steps are missing.</span>") + hidden.join("");
    $("feed").innerHTML = S.board.available ? (S.board.history.slice().reverse().slice(0, 7).map((x) => `<li><time>${when(x.t)}</time><span>${esc(x.text)}</span></li>`).join("") || "<li><span>No change recorded.</span></li>") : "<li><span>The board could not be read.</span></li>";
    details();
    applyEdit();
    requestAnimationFrame(draw);
  }
  function applyEdit() {
    const m = document.querySelector(".mimic"); if (!m) return;
    m.classList.toggle("editing", editing); $("editbox").hidden = !editing;
    $("editbtn").setAttribute("aria-pressed", editing); $("editbtn").textContent = editing ? "Done editing" : "Edit";
  }
  function details() {
    const p = P(), todo = p.next.map(stepById).filter(Boolean);
    const sel = stepById(selected) || todo[0] || p.steps[0];
    selected = sel ? sel.id : null;
    if (!laneOf(rowSel)) rowSel = sel ? sel.name : (p.lanes[0] || {}).name || null;
    document.querySelectorAll("#wall .lamp").forEach((t) => t.setAttribute("aria-pressed", t.dataset.id === selected));
    document.querySelectorAll("#wall .lanebtn").forEach((t) => t.setAttribute("aria-pressed", t.dataset.id === rowSel));
    const states = sel && sel.source === "board" ? ["todo", "sent", "done"] : ["todo", "sent", "done", "failed"];
    $("selected").innerHTML = !sel ? "<h2>Step</h2><p class='fine'>The pipeline is empty. Add a row and a step.</p>" : `<h2>Step</h2><h3>${esc(stageLabel(sel.stage))} of ${esc(sel.name)}</h3>
      <dl><dt>State</dt><dd>${badge(sel.view)}</dd><dt>Comes from</dt><dd>${sel.source === "board" ? "the work board" : "added in Command Room"}</dd>
      <dt>Last change</dt><dd>${when(sel.updated)}</dd>${sel.note ? `<dt>Note</dt><dd>${esc(sel.note)}</dd>` : ""}<dt>Rule</dt><dd>${esc(sel.rule || "Nothing to do here.")}</dd></dl>
      <div class="acts">${states.map((k) => `<button class="plain" data-act="state" data-id="${esc(sel.id)}" data-state="${k}" aria-pressed="${sel.state === k}">${PLAIN[k]}</button>`).join("")}</div>
      <div class="acts">${sel.kind && sel.kind !== "waiting" ? `<button class="solid" data-act="tolaunch" data-id="${esc(sel.id)}">Launch this step</button>` : ""}
        <button class="plain" data-act="dropstep" data-id="${esc(sel.id)}">${sel.source === "board" ? "Hide it here" : "Remove it"}</button></div>
      <p class="fine">${sel.source === "board" ? (S.settings.board.writable ? "Changing the state changes the work board, through its own command line." : "The board's command line is not set, so the state can only be read.") : "This step lives in Command Room only."}</p>`;
    const l = laneOf(rowSel), box = $("rowbox");
    if (box.contains(document.activeElement) && box.dataset.row === rowSel) return;
    box.dataset.row = rowSel || "";
    box.innerHTML = !l ? "<h2>Row</h2><p class='fine'>No row yet.</p>" : `<h2>Row</h2><h3>${esc(l.name)}</h3><form id="laneForm">
      <label class="field">Variant of<select name="parent"><option value="">nothing, it is a material</option>${p.lanes.filter((x) => !x.parent && x.name !== l.name).map((x) => `<option ${x.name === l.parent ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
      <label class="check"><input type="checkbox" name="polar" ${l.polar && !l.parent ? "checked" : ""} ${l.parent ? "disabled" : ""}> Polar (needs Born charges and --lr)</label>
      <label class="check"><input type="checkbox" name="potential" ${l.potential ? "checked" : ""}> Forces come from a potential, not VASP</label>
      <label class="field">Calculation folder on the cluster<input type="text" name="folder" value="${esc(l.folder)}" placeholder="/full/path/to/the/folder" spellcheck="false"></label>
      <div class="acts" style="margin-top:0"><button class="solid">Save</button>${S.clusters.filter((x) => x.enabled).map((x) => `<button type="button" class="plain" data-act="findfolders" data-id="${esc(x.id)}">Look on ${esc(x.label)}</button>`).join("")}</div>
      <div id="folderList"></div></form>`;
    if (l) $("laneForm").addEventListener("submit", (e) => { e.preventDefault(); const f = e.target;
      change("lane_props", { name: l.name, parent: f.parent.value, polar: f.polar.checked, potential: f.potential.checked, folder: f.folder.value }); });
  }
  function clusterLine(c) {
    if (c.mode === "manual") { if (!c.jobs) return "You run the commands here. Command Room never logs in.";
      const r = c.jobs.filter((j) => j.state === "running").length, w = c.jobs.filter((j) => j.state === "queued").length;
      return (c.jobs.length ? `${r} running, ${w} queued.` : "The queue is empty.") + ` From what you pasted ${when(c.read)}.`; }
    if (!c.configured) return "Its login is not in the local settings.";
    if (!c.enabled) return "Switched off. Command Room has not been allowed to read this queue.";
    if (c.error) return c.error;
    if (!c.jobs) return "Reading the queue";
    const run = c.jobs.filter((j) => j.state === "running").length, q = c.jobs.filter((j) => j.state === "queued").length;
    return c.jobs.length ? `${run} running, ${q} queued. Read ${when(c.read)}.` : `The queue is empty. Read ${when(c.read)}.`;
  }

  /* ---------- jobs: everything that runs, in one place ---------- */
  const jobLine = (j) => `<p class="mono">${esc(j.name)}  ${j.step || 0}/${j.total || "?"}  ${esc(j.phase || "")}  ${esc(j.metric || "")}</p><div class="prog"><i style="width:${j.total ? Math.round(100 * j.step / j.total) : 0}%"></i></div>`;
  let SENDER = {};
  const copyBox = (text) => `<div class="copy"><pre class="out">${esc(text)}</pre><button type="button" class="plain" data-act="copy" data-copy="${esc(text)}">Copy</button></div>`;
  const manualPlan = (plan) => `<p class="callout">${esc(plan.where)} is run by you. Copy the command, run it there, and paste what it printed. Command Room never logs in.</p>
    ${plan.copy_dry ? `<p class="fine">1. The dry run</p>${copyBox(plan.copy_dry)}<textarea id="drypaste" placeholder="Paste here what the dry run printed"></textarea><div class="row-actions"><button class="solid" data-act="drypasted">Read what I pasted</button></div>` : ""}
    ${!plan.copy_dry || plan.dry_ok === true ? `<p class="fine">${plan.copy_dry ? "2. " : ""}The real command, for you to run</p>${copyBox(plan.copy_real)}<div class="row-actions"><button class="danger" data-act="marksent">I ran it</button></div>` : ""}`;
  const queueTable = (jobs) => `<table class="grid"><thead><tr><th>Job</th><th>Name</th><th>State</th><th>Elapsed</th><th>Limit</th><th>Nodes</th><th>Row</th></tr></thead><tbody>${jobs.map((j) => `<tr><td class="num">${esc(j.id)}</td><td class="num">${esc(j.name)}</td><td>${badge(j.state, j.state)}</td><td class="num">${esc(j.elapsed || "")}</td><td class="num">${esc(j.limit || "")}</td><td class="num">${esc(j.nodes || "")}</td><td>${esc(j.row || "")}</td></tr>`).join("")}</tbody></table>`;
  const active = (c) => (c.jobs ? c.jobs.filter((j) => j.state === "running" || j.state === "queued").length : 0);
  function sshPlace(c) {
    return `<div class="head"><h3 class="big">${esc(c.label)}</h3><span class="row-actions" style="margin:0 0 0 auto">${c.enabled ? `<button class="plain" data-act="queue" data-id="${esc(c.id)}">Read now</button>` : ""}
      <button class="${c.enabled ? "plain" : "solid"}" data-act="cluster" data-id="${esc(c.id)}" data-on="${c.enabled ? "" : "1"}" ${c.configured ? "" : "disabled"}>${c.enabled ? "Switch off" : "Allow reading"}</button></span></div>
      <p class="lead">${c.enabled ? "Command Room logs in with your key and reads the queue about once a minute while this window is open. Nothing is sent from this page." : "Switching it on is your permission for Command Room to log in with your key and read the queue."}</p>
      ${c.enabled && c.jobs && c.jobs.length ? queueTable(c.jobs) : `<p class="empty">${esc(clusterLine(c))}</p>`}`;
  }
  function manualPlace(c) {
    const cmds = SENDER[c.id];
    return `<div class="head"><h3 class="big">${esc(c.label)}</h3><span class="badge todo" style="margin-left:auto"><i></i>you run it</span></div>
      <p class="lead">Command Room never logs in here and never sees your password. Copy a command, run it yourself, and paste what it printed.</p>
      <div class="twocol"><div><h3>The queue</h3>${copyBox(c.command)}
        <textarea id="paste-${esc(c.id)}" placeholder="Paste here what it printed (leave it empty if it printed nothing)"></textarea>
        <div class="row-actions"><button class="solid" data-act="paste" data-id="${esc(c.id)}">Read what I pasted</button><span class="fine" style="margin:0">${c.jobs ? esc(clusterLine(c)) : ""}</span></div>
        ${c.jobs && c.jobs.length ? queueTable(c.jobs) : ""}</div>
      <div>${c.sender ? `<h3>Send a folder of calculations</h3><form data-sender="${esc(c.id)}"><label class="field">Folder, as you give it to your sender script<input type="text" name="folder" placeholder="Rattle30Si" spellcheck="false" required></label>
        <label class="field">Only these materials (optional, separated by commas)<input type="text" name="only" spellcheck="false"></label><button class="plain">Prepare the commands</button></form>
        ${cmds ? `<ol class="stepsdone"><li><span>See what it would do</span>${copyBox(cmds.dry)}</li><li><span>Send</span>${copyBox(cmds.send)}</li><li><span>How it is going</span>${copyBox(cmds.status)}</li><li><span>Bring the results back</span>${copyBox(cmds.collect)}</li></ol>` : ""}` : "<h3>Send a folder of calculations</h3><p class='empty'>The sender script is not set in the local settings.</p>"}</div></div>`;
  }
  function localPlace(loc) {
    if (loc === null) return `<div class="head"><h3 class="big">This computer</h3></div><p class="empty">The folder with the job files is not set in the local settings.</p>`;
    return `<div class="head"><h3 class="big">This computer</h3></div><p class="lead">Jobs that report their progress through the job tracker. A finished job stays here for 5 minutes, then moves to the list below.</p>
      ${loc.live.length ? loc.live.map((j) => `${jobLine(j)}<p>${badge(j.state === "running" ? "running" : j.state, j.state)} <span class="fine">updated ${when(j.updated)}</span></p>`).join("") : `<p class="empty">Nothing is running.</p>`}
      ${loc.history.length ? `<h3>Finished</h3><table class="grid"><thead><tr><th>Name</th><th>Project</th><th>State</th><th>Last step</th><th>Result</th><th>Ended</th></tr></thead><tbody>${loc.history.map((j) => `<tr><td class="num">${esc(j.name)}</td><td>${esc(j.project || "")}</td><td>${badge(j.state, j.state)}</td><td class="num">${j.step || 0}/${j.total || "?"}</td><td class="num">${esc(j.metric || "")}</td><td class="num">${when(j.updated)}</td></tr>`).join("")}</tbody></table>` : ""}`;
  }
  function jobsArea() {
    const loc = S.local, ids = S.clusters.map((c) => c.id).concat(["local"]), run = running().length;
    if (!ids.includes(place)) place = (S.clusters.find((c) => active(c)) || {}).id || (run ? "local" : ids[0]);
    const tiles = S.clusters.map((c) => { const n = active(c), man = c.mode === "manual", known = !!c.jobs;
      const cls = man ? (known ? (n ? "busy" : "on") : "") : !c.enabled ? "" : c.error ? "bad" : n ? "busy" : "on";
      return `<button class="place ${cls}" data-act="place" data-id="${esc(c.id)}" aria-pressed="${place === c.id}"><b><i></i>${esc(c.label)}<em>${known ? n : "–"}</em></b><span>${man ? (known ? "from what you pasted" : "you run it") : !c.enabled ? "switched off" : c.error ? "could not be read" : known ? "running or queued" : "reading"}</span></button>`; }).join("") +
      `<button class="place ${run ? "busy" : loc ? "on" : ""}" data-act="place" data-id="local" aria-pressed="${place === "local"}"><b><i></i>This computer<em>${loc ? run : "–"}</em></b><span>${loc ? "running now" : "not set"}</span></button>`;
    const c = S.clusters.find((x) => x.id === place);
    $("main").innerHTML = `<div class="area"><h1>Jobs</h1><p class="lead">Three places where work runs. Choose one to see its queue.</p>
      <div class="places">${tiles}</div><section class="panel">${place === "local" ? localPlace(loc) : c.mode === "manual" ? manualPlace(c) : sshPlace(c)}</section></div>`;
  }

  /* ---------- launch: one step, one plan, a dry run, then your click ---------- */
  async function pickStep(id) { L = { step: id, options: null, plan: null, result: null, busy: "" }; try { L.options = await get("/api/launch/options?step=" + encodeURIComponent(id)); if (L.options.error) { toast(L.options.error, true); L.options = null; } } catch (e) { toast("The step could not be read.", true); } launchArea(); }
  function launchArea() {
    const p = P(), open = p.next.map(stepById).filter(Boolean).concat(p.steps.filter((s) => s.state === "failed")), o = L.options, plan = L.plan;
    let right = `<div class="panel"><p class="lead" style="margin:0">Choose a step. It is prepared as a plan: the exact command, where it runs, and a dry run before anything is sent.</p></div>`;
    if (o) {
      const on = o.clusters.filter((c) => c.enabled);
      right = `<div class="panel"><h2>Step</h2><h3 style="margin-top:0">${esc(o.stage.label)} of ${esc(o.step.name)}</h3><p class="lead">${esc(o.step.rule || "")}</p>
        ${!o.actions.length ? `<p class="callout">This process has no command yet. Write the command it runs:</p><form id="cmdForm"><textarea name="command" placeholder="python my_script.py"></textarea><div class="row-actions"><button class="solid">Save the command</button></div></form>` : `
        <form id="planForm">
          <label class="field">Action<select name="action">${o.actions.map((a) => `<option value="${esc(a.id)}">${esc(a.label)}</option>`).join("")}</select></label>
          <div id="fields"></div>
          <label class="field">Where it runs<select name="cluster">${o.clusters.map((c) => `<option value="${esc(c.id)}">${esc(c.label)}${c.manual ? " (you run it)" : c.enabled ? "" : " (switched off)"}</option>`).join("")}</select></label>
          <label class="field">Calculation folder<input type="text" name="folder" value="${esc(o.folder)}" placeholder="/full/path/to/the/calculation/folder" spellcheck="false"></label>
          <label class="check"><input type="checkbox" name="remember" checked> Remember this folder for ${esc(o.step.name)}</label>
          <div class="row-actions" style="margin-bottom:0"><button class="solid">Prepare the plan</button></div>
        </form>`}</div>
        ${plan ? `<div class="panel" style="margin-top:14px"><h2>The plan</h2><dl><dt>Where</dt><dd>${esc(plan.where)}</dd><dt>Folder</dt><dd class="mono">${esc(plan.folder)}</dd><dt>Action</dt><dd>${esc(plan.label)}</dd></dl>
          ${plan.dry ? `<p class="fine">Dry run</p><pre class="out">${esc(plan.dry)}</pre>` : ""}<p class="fine">${plan.mode === "read" ? "Command (it only reads)" : "Command that really runs"}</p><pre class="out">${esc(plan.real)}</pre>
          ${plan.notes.map((n) => `<p class="callout">${esc(n)}</p>`).join("")}
          ${!plan.manual && !on.some((c) => c.id === plan.cluster) ? `<p class="callout bad">${esc(plan.where)} is switched off. Allow reading it in Jobs to run the dry run.</p>` : ""}
          ${plan.manual ? manualPlan(plan) : ""}<div class="row-actions" ${plan.manual ? "hidden" : ""}>${plan.dry || plan.mode === "read" ? `<button class="solid" data-act="dry" ${L.busy ? "disabled" : ""}>${plan.mode === "read" ? "Run it (it only reads)" : "Run the dry run"}</button>` : ""}
            ${plan.mode !== "read" ? `<button class="danger" data-act="submit" ${L.busy || (plan.dry && plan.dry_ok !== true) ? "disabled" : ""}>${plan.mode === "submit" ? "Send it to " + esc(plan.where) : "Run it on " + esc(plan.where)}</button>` : ""}
            ${L.busy ? `<span class="fine">${esc(L.busy)}</span>` : ""}</div>
          ${plan.dry_output !== null ? `<p class="callout ${plan.dry_ok ? "good" : "bad"}">${plan.dry_ok ? "The dry run finished without an error. Read what it would do:" : "The dry run reported a problem. Nothing can be sent until it passes:"}</p><pre class="out">${esc(plan.dry_output || "(no output)")}</pre>` : ""}</div>` : ""}
        ${L.result ? `<div class="panel" style="margin-top:14px"><p class="callout ${L.result.ok ? "good" : "bad"}">${L.result.ok ? "Done. " + esc(L.result.board || "") : "The command reported an error."}</p><pre class="out">${esc(L.result.output || "(no output)")}</pre></div>` : ""}`;
    }
    $("main").innerHTML = `<div class="area"><h1>Launch</h1><p class="lead">Open steps, in the order they can go.</p><div class="split"><ul class="list">${open.map((s) => `<li><button data-act="pick" data-id="${esc(s.id)}" aria-current="${s.id === L.step}">${esc(stageLabel(s.stage))} of ${esc(s.name)}<span>${WORD[s.view]}</span></button></li>`).join("") || "<li><button disabled>No open step</button></li>"}</ul><div>${right}</div></div></div>`;
    const pf = $("planForm");
    if (pf) {
      const fields = () => { const a = o.actions.find((x) => x.id === pf.action.value) || {}; const f = a.fields || [];
        $("fields").innerHTML = (f.includes("n") ? `<label class="field">Number of structures<input type="number" name="n" min="1" step="1" required></label>` : "") +
          (f.includes("c3") ? `<label class="field">Target distance of the 3rd order, in Å (empty = the value in hipipe.cfg)<input type="number" name="c3" min="0" step="0.01"></label><label class="field">Target distance of the 4th order, in Å<input type="number" name="c4" min="0" step="0.01"></label>` : ""); };
      fields(); pf.action.addEventListener("change", fields);
      if (plan) { pf.action.value = plan.action; fields(); pf.cluster.value = plan.cluster; pf.folder.value = plan.folder; }
      else { const en = o.clusters.find((c) => c.enabled); if (en) pf.cluster.value = en.id; }
      pf.addEventListener("submit", async (e) => { e.preventDefault(); const fd = {}; ["n", "c3", "c4"].forEach((k) => { if (pf[k]) fd[k] = pf[k].value; });
        try { const r = await post("/api/launch/prepare", { step: L.step, action: pf.action.value, cluster: pf.cluster.value, folder: pf.folder.value.trim(), fields: fd, remember: pf.remember.checked }); L.plan = r.plan; L.result = null; }
        catch (err) { toast(err.message, true); } launchArea(); });
    }
    const cf = $("cmdForm");
    if (cf) cf.addEventListener("submit", (e) => { e.preventDefault(); change("stage_command", { id: o.stage.id, command: cf.command.value }).then(() => pickStep(L.step)); });
  }
  async function dryRun() { L.busy = "Asking the cluster"; launchArea(); try { L.plan = (await post("/api/launch/dry", { token: L.plan.token })).plan; } catch (e) { toast(e.message, true); } L.busy = ""; launchArea(); }
  async function submitPlan() {
    L.busy = "Sending"; launchArea();
    try { L.result = await post("/api/launch/submit", { token: L.plan.token, confirm: L.plan.token }); L.plan = null; lastKey = ""; load(true); } catch (e) { toast(e.message, true); }
    L.busy = ""; launchArea();
  }

  /* ---------- reports and library ---------- */
  async function reportsArea(refresh) {
    if (!REP || refresh) { const [list, res] = await Promise.all([get("/api/reports"), get("/api/results")]); REP = { list: list.reports, kappa: res.kappa, runs: res.potentials }; }
    const mats = [...new Set(REP.kappa.map((r) => r.material || ""))], sources = [...new Set(REP.kappa.map((r) => r.source))];
    const ask = (key, text, n) => `<span class="askrow">${text} <button class="danger" data-act="repremove" data-id="${esc(key)}">Remove${n > 1 ? " all " + n : ""}</button> <button class="plain" data-act="repkeep">Keep</button></span>`;
    $("main").innerHTML = `<div class="area"><h1>Reports</h1><p class="lead">PDF reports in the layout of your own: a cover, then one topic per page with the figure, a table and how to read it. Every number is read from a result file. The same graphs are live in <a class="link" href="#results">Results</a>, where you can hover them and switch runs.</p>
      <div class="cards"><div class="card"><h3>Thermal conductivity of the runs</h3>${REP.kappa.length ? `<form id="repK"><label class="field">Material<select name="material">${mats.map((m) => `<option value="${esc(m)}">${esc(m || "not known")}</option>`).join("")}</select></label><label class="field">Reference<select name="reference">${sources.map((s) => `<option ${s === "DFT" ? "selected" : ""}>${esc(s)}</option>`).join("")}</select></label>
          <label class="field">Solution<select name="which"><option value="conv">iterative (converged)</option><option value="rta">relaxation time (RTA)</option></select></label>
          <button class="solid" ${repBusy ? "disabled" : ""}>Build the report</button></form>` : "<p>No ShengBTE result was found on this computer.</p>"}</div>
        <div class="card"><h3>A training run of a potential</h3>${REP.runs.length ? `<form id="repP"><label class="field">Run (best held-out error first)<select name="name">${[...new Set(REP.runs.map((r) => r.element || ""))].map((el) => `<optgroup label="${esc(el || "Element not known")}">${REP.runs.filter((r) => (r.element || "") === el).slice(0, 40).map((r) => `<option>${esc(r.name)}</option>`).join("")}</optgroup>`).join("")}</select></label>
          <button class="solid" ${repBusy ? "disabled" : ""}>Build the report</button></form>` : "<p>No training run was found on this computer.</p>"}</div></div>
      ${repBusy ? `<p class="fine">${esc(repBusy)}</p>` : ""}
      <h3>Reports made here</h3>${REP.list.length ? `<table class="grid"><thead><tr><th>File</th><th>Made</th><th>Size</th><th></th></tr></thead><tbody>${REP.list.map((f) => `<tr><td><a class="link" href="/reports/${encodeURIComponent(f.name)}" target="_blank" rel="noopener">${esc(f.name)}</a></td><td class="num">${when(f.modified)}</td><td class="num">${Math.round(f.size / 1024)} kB</td>
        <td class="act">${repAsk === f.name ? ask(f.name, "Remove this file for good?", 1) : `<button class="plain" data-act="repask" data-id="${esc(f.name)}">Remove</button>`}</td></tr>`).join("")}</tbody></table>
        <p class="fine">${repAsk === "*" ? ask("*", `Remove all ${REP.list.length} files for good?`, REP.list.length) : REP.list.length > 1 ? `<button class="link" data-act="repask" data-id="*">Remove all ${REP.list.length} reports</button>` : ""} A removed report cannot be brought back, but it can be built again from the same results.</p>` : "<p class='lead'>None yet.</p>"}</div>`;
    const build = async (body) => { repBusy = "Drawing the pages"; reportsArea(); try { const r = await post("/api/reports/build", body); toast(r.message); } catch (e) { toast(e.message, true); } repBusy = ""; reportsArea(true); };
    if ($("repK")) $("repK").addEventListener("submit", (e) => { e.preventDefault(); build({ kind: "kappa", material: e.target.material.value, reference: e.target.reference.value, which: e.target.which.value }); });
    if ($("repP")) $("repP").addEventListener("submit", (e) => { e.preventDefault(); build({ kind: "potential", name: e.target.name.value }); });
  }
  async function libraryArea() {
    if (!LIB) LIB = (await get("/api/library")).pages;
    const q = libQuery.toLowerCase();
    const hits = LIB.filter((p) => !q || (p.title + " " + p.tags.join(" ") + " " + p.text.join(" ")).toLowerCase().includes(q));
    const page = LIB.find((p) => p.id === libPage) || hits[0];
    $("main").innerHTML = `<div class="area"><h1>Library</h1><p class="lead">The rules and explanations this program uses, each with its source.</p><div class="split"><div><label class="field">Search<input type="text" id="libq" value="${esc(libQuery)}" placeholder="cutoffs, polar, rfe"></label>
      <ul class="list">${hits.map((p) => `<li><button data-act="page" data-id="${p.id}" aria-current="${!!page && p.id === page.id}">${esc(p.title)}</button></li>`).join("") || "<li><button disabled>Nothing found</button></li>"}</ul></div>
      <div class="panel page">${page ? `<h3 style="margin-top:0;font-size:19px">${esc(page.title)}</h3><div class="tagrow">${page.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>${page.text.map((t) => `<p>${esc(t)}</p>`).join("")}<p class="source">Source: ${esc(page.source)}</p>` : "<p class='lead'>No page matches.</p>"}</div></div></div>`;
    $("libq").addEventListener("input", (e) => { libQuery = e.target.value; libPage = null; const pos = e.target.selectionStart; libraryArea().then(() => { const i = $("libq"); i.focus(); i.setSelectionRange(pos, pos); }); });
  }

  /* ---------- render and events ---------- */
  function render(full) {
    if (!S) return;
    chips();
    if (!full && typing()) { dirty = true; return; }
    dirty = false;
    if (area === "overview") overview(full || !$("wall"));
    else if (area === "jobs") jobsArea();
    else if (area === "launch") { if (full) launchArea(); }
    else if (area === "results") { if (full) window.CRResults.render($("main"), get); }
    else if (area === "reports") { if (full) reportsArea(true); }
    else if (area === "library") { if (full) libraryArea(); }
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b || !S) return;
    const id = b.dataset.id, a = b.dataset.act;
    if (a === "select") { selected = id; const s = stepById(id); if (s) rowSel = s.name; details(); }
    else if (a === "row") { rowSel = id; $("rowbox").dataset.row = ""; details(); }
    else if (a === "editmode") { editing = !editing; applyEdit(); }
    else if (a === "place") { place = id; jobsArea(); }
    else if (a === "repask") { repAsk = id; reportsArea(); }
    else if (a === "repkeep") { repAsk = null; reportsArea(); }
    else if (a === "repremove") { repAsk = null; post("/api/reports/remove", id === "*" ? { names: REP.list.map((f) => f.name) } : { name: id }).then((r) => { toast(r.message); reportsArea(true); }).catch((err) => { toast(err.message, true); reportsArea(true); }); }
    else if (a === "stat") { if (id === "running") { place = "local"; go("jobs"); } else { const want = { ready: "ready", check: "attention", waiting: "waiting" }[id], s = P().steps.find((x) => x.kind === want);
      if (s) { selected = s.id; rowSel = s.name; details(); const d = $("selected"); if (d) d.scrollIntoView({ behavior: "smooth", block: "nearest" }); } } }
    else if (a === "undo") act(() => post("/api/undo"));
    else if (a === "dropstage") change("remove_stage", { id });
    else if (a === "backstage") change("add_stage", { label: id, after: "__end" });
    else if (a === "move") change("move_stage", { id, direction: b.dataset.dir });
    else if (a === "droplane") change("remove_lane", { name: id });
    else if (a === "showlane") change("show_lane", { name: id });
    else if (a === "showsteps") change("show_steps", {});
    else if (a === "addstep") change("add_step", { stage: b.dataset.stage, name: b.dataset.lane });
    else if (a === "state") change("set_state", { id, state: b.dataset.state });
    else if (a === "dropstep") { selected = null; change("remove_step", { id }); }
    else if (a === "tolaunch") { area = "launch"; location.hash = "launch"; tabs(); $("main").scrollTo(0, 0); pickStep(id); }
    else if (a === "pick") pickStep(id);
    else if (a === "dry") dryRun();
    else if (a === "submit") submitPlan();
    else if (a === "copy") navigator.clipboard.writeText(b.dataset.copy).then(() => toast("Copied."), () => toast("Could not copy: select the text and copy it by hand.", true));
    else if (a === "paste") { const t = $("paste-" + id); act(() => post("/api/paste", { id, text: t ? t.value : "" })); }
    else if (a === "drypasted") post("/api/launch/pasted", { token: L.plan.token, text: $("drypaste").value }).then((r) => { L.plan = r.plan; launchArea(); }).catch((err) => toast(err.message, true));
    else if (a === "marksent") post("/api/launch/sent", { token: L.plan.token }).then((r) => { L.result = r; L.plan = null; lastKey = ""; load(true); launchArea(); }).catch((err) => toast(err.message, true));
    else if (a === "cluster") act(() => post("/api/cluster", { id, enabled: !!b.dataset.on }));
    else if (a === "queue") act(() => post("/api/queue", { id }));
    else if (a === "page") { libPage = id; libraryArea(); }
    else if (a === "usefolder") { const f = $("laneForm"); if (f) f.folder.value = id; }
    else if (a === "findfolders") { const l = laneOf(rowSel); const mat = l.parent || l.name; $("folderList").innerHTML = "<p class='fine'>Looking on the cluster</p>";
      post("/api/folders", { cluster: id, material: mat }).then((r) => { $("folderList").innerHTML = r.folders.length ? `<ul class="list">${r.folders.map((f) => `<li><button type="button" data-act="usefolder" data-id="${esc(f)}"><span class="mono">${esc(f)}</span></button></li>`).join("")}</ul>` : "<p class='fine'>No calculation folder was found for this material.</p>"; })
        .catch((err) => { $("folderList").innerHTML = `<p class="callout bad">${esc(err.message)}</p>`; }); }
  });
  document.addEventListener("submit", (e) => { const f = e.target.closest("[data-sender]"); if (!f) return; e.preventDefault();
    post("/api/sender", { id: f.dataset.sender, folder: f.folder.value, only: f.only.value }).then((r) => { SENDER[f.dataset.sender] = r.commands; jobsArea(); }).catch((err) => toast(err.message, true)); });
  document.addEventListener("focusout", () => { if (dirty) setTimeout(() => { if (dirty && !typing()) render(false); }, 150); });

  async function load(force) {
    try {
      const s = await get("/api/state"), live = $("live");
      live.className = "live"; void live.offsetWidth; live.className = "live beat"; live.lastElementChild.textContent = clock(s.generated);
      const key = JSON.stringify([s.pipeline, s.local, s.clusters, s.board, s.settings, s.undo]);
      const first = !S; S = s;
      const stamp = JSON.stringify(s.results_stamp || null);
      if (lastStamp === null) { lastStamp = stamp; window.CRResults.refresh(get).catch(() => {}); }
      else if (stamp !== lastStamp) { lastStamp = stamp; REP = null;
        window.CRResults.refresh(get).then((n) => { if (n.sections.length) toast("New section in Results: " + n.sections.join(", ")); else if (n.runs.length) toast(n.runs.length === 1 ? "New result: " + n.runs[0] : n.runs.length + " new results in Results"); }).catch(() => {}); }
      if (first) { tabs(); render(true); lastKey = key; }
      else if (key !== lastKey || force) { lastKey = key; render(false); }
    } catch (e) { $("live").className = "live lost"; $("live").lastElementChild.textContent = "no contact with the local server"; }
  }
  area = (location.hash.slice(1).split("/")[0]) || "overview"; if (!AREAS.some((a) => a[0] === area)) area = "overview";
  load(); setInterval(load, 3000);
})();

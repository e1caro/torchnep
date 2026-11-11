/* Discover feed logic (no DOM, unit-tested): what to show next, what counts as read, collecting cards.
 *
 * The plan for "For you":
 *   - cards you have not read come first, in an order that is fixed for the day (so today's picks stay the same
 *     if you come back), favouring the topics you are studying and never two cards of the same kind in a row;
 *   - every 4th slot is a review question (due ones first), so scrolling also exercises memory;
 *   - every 10th slot is a quick game;
 *   - after your fifth new card of the day comes a "you are caught up" card: a natural place to stop;
 *   - then the cards you already read, oldest first.
 */
(function () {
  'use strict';
  var DA = (window.DA = window.DA || {});
  var ui = DA.ui;
  var F = (DA.feed = {});

  F.DAILY = 5;
  F.MAX = 260; // items in one plan: room for every card plus the questions and games between them
  var KIND_LABEL = { story: 'Data story', idea: 'In 30 seconds', tip: 'Tip', myth: 'Myth or fact?', chart: 'Chart crime', quote: 'Quote', word: 'Word of the day' };
  F.kindLabel = function (c) { return KIND_LABEL[c.kind] || ''; };
  F.filters = function () { return ['For you'].concat(DA.feedCats).concat(['Saved']); };

  // module category (lessons, question bank) -> feed category
  var CAT_MAP = { Statistics: 'Stats', Spreadsheets: 'Sheets', Visualization: 'Charts', 'AI workflow': 'AI', Career: 'Career', Portfolio: 'Career', Learning: 'Career', SQL: 'SQL', Python: 'Python' };
  F.focusCats = function () {
    var f = {}, nx = ui.nextLesson();
    DA.modules.forEach(function (m) { if (m.lessons.some(function (l) { return ui.state.done[l.id]; }) && CAT_MAP[m.cat]) f[CAT_MAP[m.cat]] = true; });
    if (nx && CAT_MAP[nx.module.cat]) f[CAT_MAP[nx.module.cat]] = true;
    return f;
  };

  F.collected = function () { return DA.feedCards.filter(function (c) { return ui.state.cards[c.id]; }).length; };
  F.readToday = function () { var t = ui.today(), s = ui.state.cards; return Object.keys(s).filter(function (id) { return s[id] === t; }).length; };
  F.isSaved = function (id) { return !!ui.state.saved[id]; };
  F.toggleSave = function (id, force) {
    var on = force === undefined ? !ui.state.saved[id] : !!force;
    if (on) ui.state.saved[id] = true; else delete ui.state.saved[id];
    ui.save();
    return on;
  };

  // Marks a card as read (collected). `right` is for myth cards answered correctly. Returns true the first time.
  F.markRead = function (id, right) {
    var s = ui.state, G = DA.game;
    if (!DA.feedById[id] || s.cards[id]) return false;
    s.cards[id] = ui.today();
    ui.save();
    G.award('card:' + id, ui.XP.card + (right ? ui.XP.cardRight : 0), right ? 'Right!' : 'Card collected');
    if (F.readToday() >= F.DAILY) G.award('feed5:' + ui.today(), ui.XP.feedFive, 'Daily five');
    G.touch();
    return true;
  };

  // No two cards of the same kind in a row where that can be avoided.
  function spread(list) {
    var out = [], rest = list.slice(), last = null, i;
    while (rest.length) {
      for (i = 0; i < rest.length && rest[i].kind === last; i++) { /* find the first card of another kind */ }
      if (i >= rest.length) i = 0;
      last = rest[i].kind;
      out.push(rest.splice(i, 1)[0]);
    }
    return out;
  }

  // Today's order of the cards not read yet (stable for the day).
  F.fresh = function (cat) {
    var seed = ui.today() + ':' + (cat || 'all'), focus = F.focusCats();
    var unseen = DA.feedCards.filter(function (c) { return !ui.state.cards[c.id] && (!cat || c.cat === cat); });
    var shuffled = ui.seededShuffle(unseen, seed);
    if (!cat) { // topics being studied drift to the front, without removing variety
      var rank = {};
      shuffled.forEach(function (c, i) { rank[c.id] = i - (focus[c.cat] ? shuffled.length * 0.35 : 0); });
      shuffled.sort(function (a, b) { return rank[a.id] - rank[b.id]; });
    }
    return spread(shuffled);
  };

  function reviewQuestions() {
    var D = DA.drill, s = ui.state.srs, focus = {}, nx = ui.nextLesson();
    DA.modules.forEach(function (m) { if (m.lessons.some(function (l) { return ui.state.done[l.id]; })) focus[m.cat] = true; });
    if (nx) focus[nx.module.cat] = true;
    var due = ui.seededShuffle(D.dueList(), ui.today() + ':due');
    var unseen = ui.seededShuffle(D.bank().filter(function (q) { return !s[q.id]; }), ui.today() + ':new')
      .sort(function (a, b) { return (focus[b.cat] ? 1 : 0) - (focus[a.cat] ? 1 : 0); });
    return due.concat(unseen);
  }

  // The list of feed items for a filter. Items: {type:'card', card} | {type:'quiz', q} | {type:'game'} | {type:'caught'} | {type:'end'} | {type:'empty'}
  F.plan = function (filter, startId) {
    var items = [], cat = DA.feedCats.indexOf(filter) >= 0 ? filter : '', i;
    if (filter === 'Saved') {
      DA.feedCards.forEach(function (c) { if (ui.state.saved[c.id]) items.push({ type: 'card', card: c }); });
      if (!items.length) items.push({ type: 'empty' });
      return items;
    }
    var fresh = F.fresh(cat);
    var seen = DA.feedCards.filter(function (c) { return ui.state.cards[c.id] && (!cat || c.cat === cat); })
      .sort(function (a, b) { return ui.state.cards[a.id] < ui.state.cards[b.id] ? -1 : ui.state.cards[a.id] > ui.state.cards[b.id] ? 1 : 0; });
    var start = startId && DA.feedById[startId] ? DA.feedById[startId] : null;
    if (start) {
      fresh = fresh.filter(function (c) { return c !== start; });
      seen = seen.filter(function (c) { return c !== start; });
      items.push({ type: 'card', card: start });
    }
    var quizzes = cat ? [] : reviewQuestions(), qi = 0;
    var untilCaught = cat ? -1 : F.DAILY - F.readToday() - (start && !ui.state.cards[start.id] ? 1 : 0); // new cards left before "caught up"
    var queue = fresh.concat(seen), newShown = 0, slot = items.length;
    for (i = 0; i < queue.length && items.length < F.MAX; ) {
      slot++;
      if (!cat && slot % 10 === 0) { items.push({ type: 'game' }); continue; }
      if (!cat && slot % 4 === 0 && qi < quizzes.length) { items.push({ type: 'quiz', q: quizzes[qi++] }); continue; }
      var c = queue[i++];
      items.push({ type: 'card', card: c });
      if (!ui.state.cards[c.id]) {
        newShown++;
        if (untilCaught > 0 && newShown === untilCaught) { items.push({ type: 'caught' }); slot++; }
      }
    }
    items.push({ type: 'end' });
    return items;
  };

  // A short text to share a card outside the app.
  F.shareText = function (c) {
    var lines = [c.kind === 'quote' ? '"' + c.title + '" (' + c.who + ')' : c.title];
    if (c.kind === 'myth') lines.push((c.truth ? 'Fact. ' : 'Myth. ') + c.take);
    else if (c.take) lines.push(c.take);
    lines.push('From Data Analyst Path');
    return lines.join('\n');
  };

  // Collection summary per category.
  F.collection = function () {
    return DA.feedCats.map(function (cat) {
      var all = DA.feedCards.filter(function (c) { return c.cat === cat; });
      return { cat: cat, cards: all, have: all.filter(function (c) { return ui.state.cards[c.id]; }).length };
    });
  };
})();

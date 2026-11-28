/* node tools/test.js : checks the engine (perft), every lesson step and every opening line. */
const path = require('path'), fs = require('fs');
const Chess = require(path.join(__dirname, '..', 'engine.js'));
global.Chess = Chess;
const { COURSE, OPENINGS } = require(path.join(__dirname, '..', 'content.js'));
const PUZZLES = new Function(fs.readFileSync(path.join(__dirname, '..', 'puzzles.js'), 'utf8') + '; return PUZZLES;')();
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL ' + m); };

function perft(s, d) {
  if (!d) return 1;
  let n = 0;
  for (const m of Chess.legal(s)) { const u = Chess.make(s, m); n += perft(s, d - 1); Chess.unmake(s, m, u); }
  return n;
}
const PERFT = [
  [Chess.START, 4, 197281],
  ['r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1', 3, 97862],
  ['8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1', 4, 43238],
  ['r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1', 3, 9467],
  ['rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8', 3, 62379]
];
for (const [fen, d, want] of PERFT) {
  const s = Chess.fromFEN(fen), got = perft(s, d);
  if (got !== want) fail('perft ' + fen + ' got ' + got + ' want ' + want);
  if (Chess.toFEN(s) !== fen) fail('fen roundtrip ' + fen);
}

let steps = 0;
for (const unit of COURSE) for (const les of unit.lessons) for (const [i, st] of les.steps.entries()) {
  steps++;
  const tag = les.id + '#' + (i + 1);
  if (st.t === 'pz') {
    const n = PUZZLES.filter((p) => p.k === st.k && p.r >= (st.lo || 0) && p.r <= (st.hi || 9999)).length;
    if (n < 3) fail(tag + ' puzzle pool too small: ' + n);
    continue;
  }
  if (st.t === 'quiz' && st.status && Chess.status(Chess.fromFEN(st.fen)) !== st.status) fail(tag + ' is ' + Chess.status(Chess.fromFEN(st.fen)) + ', not ' + st.status);
  if (st.t !== 'move') continue;
  const s = Chess.fromFEN(st.fen), moves = Chess.legal(s);
  const sans = moves.map((m) => Chess.san(s, m, moves));
  for (const a of (st.accept || []).concat(Object.keys(st.alt || {}))) if (!sans.includes(a)) fail(tag + ' no such move ' + a + ' in ' + sans.join(' '));
  if (st.goal === 'check' && !sans.some((x) => /[+#]/.test(x))) fail(tag + ' no check available');
  if (st.goal === 'any' && !moves.length) fail(tag + ' no moves');
  if (st.mateIn) {
    const good = Chess.mateMoves(s, st.mateIn);
    if (!good.length) fail(tag + ' no mate in ' + st.mateIn);
    if (st.mateIn > 1 && Chess.mateMoves(s, st.mateIn - 1).length) fail(tag + ' has a faster mate');
    console.log(tag + ' mate in ' + st.mateIn + ': ' + good.map((m) => Chess.san(s, m, moves)).join(' '));
    for (const a of Object.keys(st.alt || {})) if (good.some((m) => Chess.san(s, m, moves) === a)) fail(tag + ' alt is a solution ' + a);
  }
  if (!st.accept && !st.goal && !st.mateIn) fail(tag + ' has no target');
  for (const [reply, n] of st.then || []) {
    const a = Chess.play(s, Chess.fromSAN(s, st.accept[0])), r = Chess.fromSAN(a, reply);
    if (!r) fail(tag + ' then: no reply ' + reply);
    else if (!Chess.mateMoves(Chess.play(a, r), n).length) fail(tag + ' then: no mate after ' + reply);
  }
}
{
  const s = Chess.fromFEN('5rk1/8/8/8/8/8/PPPPP1PP/RNBQK2R w KQ - 0 1');
  if (Chess.fromSAN(s, 'O-O')) fail('castling quiz: O-O should be illegal');
  const st = Chess.fromFEN('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
  if (Chess.status(st) !== 'stalemate') fail('stalemate quiz is ' + Chess.status(st));
  const m = Chess.fromFEN('3R2k1/5ppp/8/8/8/8/8/6K1 b - - 0 1');
  if (Chess.status(m) !== 'checkmate') fail('mate info is ' + Chess.status(m));
}
let lines = 0;
for (const op of OPENINGS) for (const ln of op.lines) {
  lines++;
  if (Array.isArray(ln.t) && ln.t.length !== ln.moves.length) fail(op.id + ' notes ' + ln.t.length + ' moves ' + ln.moves.length);
  const s = Chess.fromFEN(Chess.START);
  for (const mv of ln.moves) {
    const m = Chess.fromSAN(s, mv);
    if (!m) { fail(op.id + ' / ' + ln.n + ': illegal ' + mv); break; }
    if (Chess.san(s, m) !== mv) fail(op.id + ' / ' + ln.n + ': san ' + mv + ' should be ' + Chess.san(s, m));
    Chess.make(s, m);
  }
  if (ln.moves.some((_, k) => !op.note[ln.moves.slice(0, k + 1).join(' ')])) fail(op.id + ' / ' + ln.n + ': a move has no note');
}
const t0 = Date.now(), r = Chess.best(Chess.fromFEN('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'), 3);
console.log('depth 3 search: ' + Chess.san(Chess.fromFEN('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'), r.move) + ' in ' + (Date.now() - t0) + ' ms');
console.log(steps + ' lesson steps, ' + OPENINGS.length + ' openings, ' + lines + ' lines, ' + (bad ? bad + ' FAILURES' : 'all OK'));
process.exit(bad ? 1 : 0);

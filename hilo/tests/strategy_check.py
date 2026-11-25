"""Independent check of the trainer's strategy chart: expected values with an infinite deck for each mix of rules
(dealer hits/stands on soft 17, double after split or not, hole card or not), compared cell by cell with engine.js.
Cells that differ are printed with their margin; two close calls are known to flip between an infinite deck and
six decks (soft 13 v 5 and soft 15 v 4 are doubles with six decks, see exact6.js). Run from this directory."""
import functools
import itertools
import json
import subprocess

P = {v: 1 / 13 for v in range(1, 10)}
P[10] = 4 / 13
UPS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 1]

ENGINE_CHART = """const BJ=require('../engine.js');
const R=BJ.rules({decks:6,h17:%s,das:%s,doubleOn:'any',maxHands:4,bj:1.5,pen:0.75,hole:'%s',spread:12});const out={};
for(const up of [2,3,4,5,6,7,8,9,10,1]){
 for(let t=5;t<=20;t++){const a=t<=11?2:10,b=t-a;if(a===b)continue;out['h'+t+'v'+up]=BJ.basic([a,b],up,true,true,R);}
 out['h8v'+up]=BJ.basic([5,3],up,true,true,R);out['h12v'+up]=BJ.basic([10,2],up,true,true,R);
 out['h20v'+up]=BJ.basic([10,7,3],up,false,false,R);
 for(let x=2;x<=9;x++)out['s'+(11+x)+'v'+up]=BJ.basic([1,x],up,true,true,R);
 for(let v=1;v<=10;v++)out['p'+v+'v'+up]=BJ.basic([v,v],up,true,true,R);
}console.log(JSON.stringify(out));"""


def add(t, soft, c):
    """A hand (total with a soft ace as 11, soft flag) after one more card."""
    t += c
    if c == 1 and t + 10 <= 21 and not soft:
        return t + 10, True
    if soft and t > 21:
        return t - 10, False
    return t, soft


def start(c):
    return (11, True) if c == 1 else (c, False)


def run(h17, das, enhc):
    @functools.lru_cache(None)
    def dealer(t, soft):
        if t > 21:
            return {22: 1.0}
        if t > 17 or (t == 17 and not (h17 and soft)):
            return {t: 1.0}
        out = {}
        for c, p in P.items():
            for k, q in dealer(*add(t, soft, c)).items():
                out[k] = out.get(k, 0) + p * q
        return out

    @functools.lru_cache(None)
    def dealer_up(up):
        """Final totals; 'bj' is a natural (only without a hole card: with one, it was checked before play)."""
        t, s = start(up)
        out = {}
        norm = 0
        for c, p in P.items():
            natural = (up == 1 and c == 10) or (up == 10 and c == 1)
            if natural and not enhc:
                continue
            norm += p
            if natural:
                out['bj'] = out.get('bj', 0) + p
                continue
            for k, q in dealer(*add(t, s, c)).items():
                out[k] = out.get(k, 0) + p * q
        return {k: v / norm for k, v in out.items()}

    def stand(t, up):
        if t > 21:
            return -1.0
        ev = 0
        for k, q in dealer_up(up).items():
            ev += q * (-1 if k == 'bj' else 1 if (k == 22 or t > k) else -1 if t < k else 0)
        return ev

    @functools.lru_cache(None)
    def hit(t, soft, up):
        ev = 0
        for c, p in P.items():
            nt, ns = add(t, soft, c)
            ev += p * (-1.0 if nt > 21 else max(stand(nt, up), hit(nt, ns, up)))
        return ev

    def double(t, soft, up):
        return 2 * sum(p * stand(add(t, soft, c)[0], up) for c, p in P.items())

    def best(t, soft, up, dbl=True):
        o = {'S': stand(t, up), 'H': hit(t, soft, up)}
        if dbl:
            o['D'] = double(t, soft, up)
        return o

    def split(v, up):
        t, s = start(v)
        ev = 0
        for c, p in P.items():
            nt, ns = add(t, s, c)
            ev += p * (stand(nt, up) if v == 1 else max(best(nt, ns, up, das).values()))
        return 2 * ev

    js = ENGINE_CHART % (str(h17).lower(), str(das).lower(), 'enhc' if enhc else 'peek')
    eng = json.loads(subprocess.check_output(['node', '-e', js]))
    bad = []
    cells = 0

    def check(key, o):
        nonlocal cells
        cells += 1
        a = max(o, key=o.get)
        if a != eng[key]:
            bad.append('%s engine %s calc %s (margin %.4f)' % (key, eng[key], a, o[a] - o[eng[key]]))

    for up in UPS:
        for t in range(5, 21):
            if f'h{t}v{up}' in eng:
                check(f'h{t}v{up}', best(t, False, up, t != 20))
        for t in range(13, 21):
            check(f's{t}v{up}', best(t, True, up))
        for v in range(1, 11):
            t, soft = (12, True) if v == 1 else (2 * v, False)
            o = best(t, soft, up)
            o['P'] = split(v, up)
            check(f'p{v}v{up}', o)
    return cells, bad


KNOWN = {'s13v5', 's15v4'}      # doubles with six real decks (exact6.js)
failed = False
for h17, das, enhc in itertools.product([False, True], [True, False], [False, True]):
    cells, bad = run(h17, das, enhc)
    if any(b.split()[0] not in KNOWN for b in bad):
        failed = True
    print('%-22s %-22s %-13s %d cells, %d differ%s' % (
        'dealer hits soft 17' if h17 else 'dealer stands on 17', 'double after split' if das else 'no double after split',
        'no hole card' if enhc else 'hole card', cells, len(bad), (': ' + '; '.join(bad)) if bad else ''))
raise SystemExit(1 if failed else 0)

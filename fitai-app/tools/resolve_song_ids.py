#!/usr/bin/env python3
"""Finds the Spotify track id of every song in data/songs.txt and saves them in data/song_ids.json.

The app opens the song of the day straight in Spotify with these ids. Spotify only searches for signed-in apps
(and Songlink closed its free API), so the ids come from open music data: first Wikidata, which stores the Spotify
track id of many songs (property P2207) and answers a whole batch in one query, then MusicBrainz, whose recordings
often link to Spotify. Songs found by neither keep opening Spotify's search in the app.
With a Spotify app's keys (SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET, saved as repository secrets), Spotify's own
search is asked first and finds almost every song. Run by .github/workflows/song-ids.yml; songs already in the file are skipped, so it can be re-run.
MusicBrainz allows one request a second, so a full run takes about an hour.
"""
import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
SONGS, OUT = HERE / 'data' / 'songs.txt', HERE / 'data' / 'song_ids.json'
UA = {'User-Agent': 'FitQuest song id resolver/1.0 (https://github.com/e1caro/torchnep)'}
MB = 'https://musicbrainz.org/ws/2'
LAST_ERR = ['']


def get(url, tries=4, data=None, headers=None):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={**UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            LAST_ERR[0] = f'HTTP {e.code} {e.read()[:200]!r}'
            if e.code in (429, 503):
                time.sleep(10 * (k + 1))  # rate limited: slow down
                continue
            if e.code in (400, 401, 403, 404):
                return None
            time.sleep(5 * (k + 1))
        except Exception as e:
            LAST_ERR[0] = repr(e)[:200]
            time.sleep(5 * (k + 1))
    return None


def norm(s):
    return re.sub(r'[^a-z0-9]', '', s.lower())


def songs():
    out, genre = [], None
    for line in SONGS.read_text().splitlines():
        line = line.strip()
        if line.startswith('## '):
            genre = line[3:]
        elif genre and line and not line.startswith('#') and '|' in line:
            t, a = [x.strip() for x in line.split('|', 1)]
            out.append((t, a))
    return out


def lead(a):
    """The main artist: 'Calvin Harris feat. Rihanna' -> 'Calvin Harris'."""
    return re.split(r' & |, | feat\. | ft\. | x | and ', a)[0]


def same_artist(a, name):
    x, y = norm(lead(a)), norm(name)
    return bool(x and y) and (x in y or y in norm(a))


def variants(t):
    """Ways the title may be written: as given, without a '(...)' part, in Title Case, with a curly apostrophe."""
    base = re.sub(r'\s*[\(\[].*?[\)\]]', '', t).strip() or t
    out = set()
    for v in (t, base):
        out |= {v, v.title(), v.replace("'", '’'), v.title().replace("'", '’')}
    return out


def wikidata(pairs):
    """Spotify ids from Wikidata for many songs at once: items with that English title, a Spotify track id and a
    performer whose name matches the artist."""
    out = {}
    for i in range(0, len(pairs), 40):
        chunk = pairs[i:i + 40]
        titles = ' '.join(sorted({json.dumps(v, ensure_ascii=False) + '@en' for t, _ in chunk for v in variants(t)}))
        q = f'''SELECT ?l ?id ?pl WHERE {{ VALUES ?l {{ {titles} }} ?s rdfs:label ?l; wdt:P2207 ?id; wdt:P175 ?p.
          ?p rdfs:label ?pl. FILTER(LANG(?pl) = "en") }}'''
        res = get('https://query.wikidata.org/sparql', data=urllib.parse.urlencode({'query': q}).encode(),
                  headers={'Accept': 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded'})
        if res is None:
            print(f'  wikidata failed: {LAST_ERR[0]}', flush=True)
        rows = (res or {}).get('results', {}).get('bindings', [])
        for t, a in chunk:
            vs = variants(t)
            hit = next((r for r in rows if r['l']['value'] in vs and same_artist(a, r['pl']['value'])), None)
            if hit:
                out[f'{t}|{a}'] = hit['id']['value']
        time.sleep(1)
    return out


def musicbrainz(t, a):
    """A Spotify id from MusicBrainz: find the recording, then read its links (MusicBrainz allows 1 request a second)."""
    q = 'recording:"{}" AND artist:"{}"'.format(t.replace('"', ''), lead(a).replace('"', ''))
    res = get(MB + '/recording?' + urllib.parse.urlencode({'query': q, 'fmt': 'json', 'limit': 10}))
    time.sleep(1.1)
    recs = [r for r in (res or {}).get('recordings', []) if r.get('score', 0) >= 85
            and same_artist(a, ''.join(c.get('name', '') + c.get('joinphrase', '') for c in r.get('artist-credit', [])))]
    for r in recs[:5]:
        d = get(f"{MB}/recording/{r['id']}?inc=url-rels&fmt=json")
        time.sleep(1.1)
        for rel in (d or {}).get('relations', []):
            m = re.search(r'open\.spotify\.com/track/([A-Za-z0-9]{22})', (rel.get('url') or {}).get('resource', ''))
            if m:
                return m.group(1)
    return None


SP_TOKEN = ['']


def spotify(t, a):
    """Spotify's own search, when the repository has a Spotify app's keys (client credentials: no user account involved)."""
    cid, sec = os.environ.get('SPOTIFY_CLIENT_ID'), os.environ.get('SPOTIFY_CLIENT_SECRET')
    if not (cid and sec):
        return None
    if not SP_TOKEN[0]:
        tok = get('https://accounts.spotify.com/api/token', data=b'grant_type=client_credentials',
                  headers={'Authorization': 'Basic ' + base64.b64encode(f'{cid}:{sec}'.encode()).decode(), 'Content-Type': 'application/x-www-form-urlencoded'})
        SP_TOKEN[0] = (tok or {}).get('access_token', '')
        if not SP_TOKEN[0]:
            print(f'  spotify keys rejected: {LAST_ERR[0]}', flush=True)
            os.environ.pop('SPOTIFY_CLIENT_ID', None)
            return None
    for q in (f'track:{t} artist:{lead(a)}', f'{t} {lead(a)}'):
        res = get('https://api.spotify.com/v1/search?' + urllib.parse.urlencode({'q': q, 'type': 'track', 'limit': 5, 'market': 'US'}),
                  headers={'Authorization': 'Bearer ' + SP_TOKEN[0]})
        items = (res or {}).get('tracks', {}).get('items', [])
        hit = next((i for i in items if same_artist(a, ' '.join(x['name'] for x in i.get('artists', []))) and norm(t)[:6] in norm(i['name'])), None) \
            or next((i for i in items if same_artist(a, ' '.join(x['name'] for x in i.get('artists', [])))), None)
        if hit:
            return hit['id']
    return None


def save(ids):
    OUT.write_text(json.dumps(ids, ensure_ascii=False, indent=0, sort_keys=True) + '\n')


def probe(n):
    """Quick check: look up a few songs and print what each source finds, without writing anything."""
    pick = songs()[:: max(1, len(songs()) // n)][:n]
    wd, hits = wikidata(pick), 0
    for t, a in pick:
        key = f'{t}|{a}'
        LAST_ERR[0] = ''
        mb = musicbrainz(t, a)
        hits += bool(wd.get(key) or mb)
        print(f'{t} | {a}\n   wikidata: {wd.get(key)}  musicbrainz: {mb} {LAST_ERR[0]}', flush=True)
    print(f'wikidata {len(wd)}/{len(pick)}, either {hits}/{len(pick)}', flush=True)


def main():
    if len(sys.argv) > 2 and sys.argv[1] == '--probe':
        return probe(int(sys.argv[2]))
    ids = json.loads(OUT.read_text()) if OUT.exists() else {}
    todo = [(t, a) for t, a in songs() if f'{t}|{a}' not in ids]
    print(f'{len(ids)} known, {len(todo)} to find', flush=True)
    if os.environ.get('SPOTIFY_CLIENT_ID'):  # Spotify's own search first, when the keys are there
        sp = 0
        for n, (t, a) in enumerate(todo, 1):
            sid = spotify(t, a)
            if sid:
                ids[f'{t}|{a}'] = sid
                sp += 1
            if n % 100 == 0:
                save(ids)
            time.sleep(.15)
        save(ids)
        print(f'spotify: {sp} ids', flush=True)
        todo = [(t, a) for t, a in todo if f'{t}|{a}' not in ids]
    wd = wikidata(todo)
    ids.update(wd)
    save(ids)
    print(f'wikidata: {len(wd)} ids', flush=True)
    todo = [(t, a) for t, a in todo if f'{t}|{a}' not in ids]
    found = miss = 0
    for n, (t, a) in enumerate(todo, 1):
        sid = musicbrainz(t, a)
        if sid:
            ids[f'{t}|{a}'] = sid
            found += 1
        else:
            miss += 1
            print(f'  not found: {t} | {a}', flush=True)
        if n % 25 == 0 or n == len(todo):
            save(ids)
            print(f'{n}/{len(todo)}  musicbrainz found {found}, missing {miss}', flush=True)
    save(ids)
    print(f'done: {len(ids)} ids', flush=True)


if __name__ == '__main__':
    sys.exit(main())

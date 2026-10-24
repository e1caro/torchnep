#!/usr/bin/env python3
"""Finds the Spotify track id of every song in data/songs.txt and saves them in data/song_ids.json.

The app opens the song of the day straight in Spotify with these ids. Spotify only searches for signed-in apps,
so ids come first from Wikidata (which stores the Spotify track id of many songs, property P2207, looked up
in batches), and for the rest each song is found in Apple's public music search (or Deezer's) and Songlink
(song.link) turns that link into the Spotify one. Run by .github/workflows/song-ids.yml; songs already in the file are skipped, so it can be re-run.
Songlink allows about 10 requests a minute without a key, so a full run takes a couple of hours.
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
SONGS, OUT = HERE / 'data' / 'songs.txt', HERE / 'data' / 'song_ids.json'
UA = {'User-Agent': 'FitQuest song id resolver (github.com/e1caro/torchnep)'}


LAST_ERR = ['']


def get(url, tries=4, data=None, headers=None):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={**UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            LAST_ERR[0] = f'HTTP {e.code} {e.read()[:200]!r}'
            if e.code == 429:
                time.sleep(65)  # rate limited: wait a minute
                continue
            if e.code in (400, 404):
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
    return re.split(r' & |, | feat\. | ft\. | x | and ', a)[0]


def wikidata(pairs):
    """Spotify ids from Wikidata for many songs at once: items with that English title, a Spotify track id and a
    performer whose name matches the artist."""
    out = {}
    for i in range(0, len(pairs), 60):
        chunk = pairs[i:i + 60]
        titles = ' '.join(json.dumps(t) + '@en' for t in {t for t, _ in chunk})
        q = f'''SELECT ?l ?id ?pl WHERE {{ VALUES ?l {{ {titles} }} ?s rdfs:label ?l; wdt:P2207 ?id; wdt:P175 ?p.
          ?p rdfs:label ?pl. FILTER(LANG(?pl) = "en") }}'''
        res = get('https://query.wikidata.org/sparql', data=urllib.parse.urlencode({'query': q}).encode(),
                  headers={'Accept': 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded'})
        rows = (res or {}).get('results', {}).get('bindings', [])
        if res is None:
            print(f'  wikidata failed: {LAST_ERR[0]}', flush=True)
        for t, a in chunk:
            for r in rows:
                if r['l']['value'] == t and norm(lead(a)) and (norm(lead(a)) in norm(r['pl']['value']) or norm(r['pl']['value']) in norm(a)):
                    out[f'{t}|{a}'] = r['id']['value']
                    break
        time.sleep(1)
    return out


def songlink(link):
    sl = get('https://api.song.link/v1-alpha.1/links?' + urllib.parse.urlencode({'url': link, 'userCountry': 'US'}), tries=2)
    m = re.search(r'track/([A-Za-z0-9]{22})', ((sl or {}).get('linksByPlatform', {}).get('spotify', {}) or {}).get('url', ''))
    return m and m.group(1)


def source_link(t, a):
    """A link to the song on Apple Music or Deezer, which Songlink can read."""
    who = lead(a)
    res = get('https://itunes.apple.com/search?' + urllib.parse.urlencode({'term': f'{t} {who}', 'entity': 'song', 'limit': 5, 'country': 'US'}))
    hits = (res or {}).get('results', [])
    best = next((h for h in hits if norm(who) in norm(h.get('artistName', '')) and norm(t)[:6] in norm(h.get('trackName', ''))), None) \
        or next((h for h in hits if norm(who) in norm(h.get('artistName', ''))), None)
    if best:
        return best['trackViewUrl']
    res = get('https://api.deezer.com/search?' + urllib.parse.urlencode({'q': f'artist:"{who}" track:"{t}"'}))
    hits = (res or {}).get('data', [])
    return hits[0]['link'] if hits else None


def probe(n):
    """Quick check: look up a few songs and print every step, without writing anything."""
    pick = songs()[:: max(1, len(songs()) // n)][:n]
    wd = wikidata(pick)
    print(f'wikidata: {len(wd)}/{len(pick)}', flush=True)
    for t, a in pick:
        link = source_link(t, a)
        LAST_ERR[0] = ''
        sp = songlink(link) if link else None
        key = f"{t}|{a}"
        print(f'{t} | {a}\n   wikidata: {wd.get(key)}\n   source: {link}\n   songlink: {sp} {LAST_ERR[0]}', flush=True)
        time.sleep(6.5)


def main():
    if len(sys.argv) > 2 and sys.argv[1] == '--probe':
        return probe(int(sys.argv[2]))
    ids = json.loads(OUT.read_text()) if OUT.exists() else {}
    todo = [(t, a) for t, a in songs() if f'{t}|{a}' not in ids]
    print(f'{len(ids)} known, {len(todo)} to find', flush=True)
    wd = wikidata(todo)
    ids.update(wd)
    print(f'wikidata: {len(wd)} ids', flush=True)
    OUT.write_text(json.dumps(ids, ensure_ascii=False, indent=0, sort_keys=True) + '\n')
    todo = [(t, a) for t, a in todo if f'{t}|{a}' not in ids]
    songlink_ok = True
    found = miss = 0
    for n, (t, a) in enumerate(todo, 1):
        link = source_link(t, a)
        sid = None
        if link and songlink_ok:
            sid = songlink(link)
            time.sleep(6.5)  # Songlink: about 10 a minute
            if n == 15 and not found:  # Songlink is not answering from here: stop asking it
                print(f'  songlink gives nothing ({LAST_ERR[0]}), skipping it', flush=True)
                songlink_ok = False
        if sid:
            ids[f'{t}|{a}'] = sid
            found += 1
        else:
            miss += 1
            print(f'  not found: {t} | {a}', flush=True)
        if n % 25 == 0 or n == len(todo):
            OUT.write_text(json.dumps(ids, ensure_ascii=False, indent=0, sort_keys=True) + '\n')
            print(f'{n}/{len(todo)}  found {found}, missing {miss}', flush=True)
    OUT.write_text(json.dumps(ids, ensure_ascii=False, indent=0, sort_keys=True) + '\n')
    print(f'done: {len(ids)} ids', flush=True)


if __name__ == '__main__':
    sys.exit(main())

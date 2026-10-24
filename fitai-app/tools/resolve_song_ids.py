#!/usr/bin/env python3
"""Finds the Spotify track id of every song in data/songs.txt and saves them in data/song_ids.json.

The app opens the song of the day straight in Spotify with these ids. Spotify only searches for signed-in apps,
so each song is found in Apple's public music search (or Deezer's), and Songlink (song.link) turns that link into
the Spotify one. Run by .github/workflows/song-ids.yml; songs already in the file are skipped, so it can be re-run.
Songlink allows about 10 requests a minute without a key, so a full run takes a couple of hours.
"""
import json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
SONGS, OUT = HERE / 'data' / 'songs.txt', HERE / 'data' / 'song_ids.json'
UA = {'User-Agent': 'FitQuest song id resolver (github.com/e1caro/torchnep)'}


def get(url, tries=4):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(65)  # rate limited: wait a minute
                continue
            if e.code in (400, 404):
                return None
            time.sleep(5 * (k + 1))
        except Exception:
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


def source_link(t, a):
    """A link to the song on Apple Music or Deezer, which Songlink can read."""
    who = re.split(r' & |, | feat\. ', a)[0]
    res = get('https://itunes.apple.com/search?' + urllib.parse.urlencode({'term': f'{t} {who}', 'entity': 'song', 'limit': 5, 'country': 'US'}))
    hits = (res or {}).get('results', [])
    best = next((h for h in hits if norm(who) in norm(h.get('artistName', '')) and norm(t)[:6] in norm(h.get('trackName', ''))), None) \
        or next((h for h in hits if norm(who) in norm(h.get('artistName', ''))), None)
    if best:
        return best['trackViewUrl']
    res = get('https://api.deezer.com/search?' + urllib.parse.urlencode({'q': f'artist:"{who}" track:"{t}"'}))
    hits = (res or {}).get('data', [])
    return hits[0]['link'] if hits else None


def main():
    ids = json.loads(OUT.read_text()) if OUT.exists() else {}
    todo = [(t, a) for t, a in songs() if f'{t}|{a}' not in ids]
    print(f'{len(ids)} known, {len(todo)} to find', flush=True)
    found = miss = 0
    for n, (t, a) in enumerate(todo, 1):
        link = source_link(t, a)
        sid = None
        if link:
            sl = get('https://api.song.link/v1-alpha.1/links?' + urllib.parse.urlencode({'url': link, 'songIfSingle': 'true'}))
            m = re.search(r'track/([A-Za-z0-9]{22})', ((sl or {}).get('linksByPlatform', {}).get('spotify', {}) or {}).get('url', ''))
            sid = m and m.group(1)
            time.sleep(6.5)  # Songlink: about 10 a minute
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

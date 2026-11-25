#!/usr/bin/env python3
"""Builds the desktop program: one Windows .exe holding the Blackjack table (../blackjack) and the Hi-Lo trainer
(../hilo) behind a home screen.

    python3 build.py              assemble frontend/ and cross-compile dist/BlackjackHiLo.exe (needs Go)
    python3 build.py --frontend   only assemble frontend/ (what the tests open in a browser)

frontend/ is generated: the two web apps are copied in unchanged except that their fonts come from fonts/ instead of
the network, and overlay/ is added to them: fit.js draws everything at the size of the window, desktop.{css,js} is the
desktop layer (the links between the apps, the commands, the panels beside the table)."""
import hashlib
import os
import pathlib
import re
import shutil
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = HERE / 'frontend'

FACES = [  # family, style, weight, file
    ('Bodoni Moda', 'normal', '500 900', 'bodoni-moda-latin-standard-normal.woff2'),
    ('Bodoni Moda', 'italic', '500 900', 'bodoni-moda-latin-standard-italic.woff2'),
    ('Instrument Sans', 'normal', '400', 'instrument-sans-latin-400-normal.woff2'),
    ('Instrument Sans', 'normal', '500', 'instrument-sans-latin-500-normal.woff2'),
    ('Instrument Sans', 'normal', '600', 'instrument-sans-latin-600-normal.woff2'),
    ('DM Mono', 'normal', '400', 'dm-mono-latin-400-normal.woff2'),
    ('DM Mono', 'normal', '500', 'dm-mono-latin-500-normal.woff2'),
    ('DM Serif Display', 'normal', '400', 'dm-serif-display-latin-400-normal.woff2'),
    ('Manrope', 'normal', '500', 'manrope-latin-500-normal.woff2'),
    ('Manrope', 'normal', '600', 'manrope-latin-600-normal.woff2'),
    ('Manrope', 'normal', '700', 'manrope-latin-700-normal.woff2'),
    ('Manrope', 'normal', '800', 'manrope-latin-800-normal.woff2'),
]
FONT_LINKS = re.compile(r'[ \t]*<link rel="preconnect"[^>]*>\n|[ \t]*<link [^>]*fonts\.googleapis\.com[^>]*>\n')


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(text.encode('utf-8'))          # bytes: the same file on every system


def app_page(src, extra_head=''):
    """An app's index.html with local fonts and the overlay (fit.js in the head: it must run before the app does)."""
    html = src.read_text(encoding='utf-8').replace('\r\n', '\n')
    html, n = FONT_LINKS.subn('', html)
    assert n >= 2, 'font links not found in %s' % src
    assert 'fonts.googleapis.com' not in html and 'fonts.gstatic.com' not in html
    head = ('<link rel="stylesheet" href="../fonts/fonts.css">\n<link rel="stylesheet" href="../desktop.css">\n'
            '<script src="../fit.js"></script>\n' + extra_head)
    assert html.count('</head>') == 1 and html.count('</body>') == 1
    return html.replace('</head>', head + '</head>').replace('</body>', '<script src="../desktop.js"></script>\n</body>')


def frontend():
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / 'fonts').mkdir(parents=True)
    css = ''
    for family, style, weight, name in FACES:
        shutil.copyfile(HERE / 'fonts' / name, OUT / 'fonts' / name)
        css += "@font-face { font-family: '%s'; font-style: %s; font-weight: %s; font-display: swap; src: url(%s) format('woff2'); }\n" % (family, style, weight, name)
    write(OUT / 'fonts' / 'fonts.css', css)
    shutil.copyfile(HERE / 'fonts' / 'LICENSES.txt', OUT / 'fonts' / 'LICENSES.txt')
    for name in ('desktop.css', 'desktop.js', 'fit.js'):
        write(OUT / name, (HERE / 'overlay' / name).read_text(encoding='utf-8').replace('\r\n', '\n'))
    write(OUT / 'index.html', (HERE / 'home' / 'index.html').read_text(encoding='utf-8').replace('\r\n', '\n'))

    bj = ROOT / 'blackjack'
    page = app_page(bj / 'index.html')
    page = re.sub(r'[ \t]*<link rel="(manifest|apple-touch-icon)"[^>]*>\n', '', page)     # nothing to install here
    write(OUT / 'blackjack' / 'index.html', page)
    for rel in ('css/style.css', 'js/engine.js', 'js/sound.js', 'js/app.js', 'icons/icon.svg'):
        write(OUT / 'blackjack' / rel, (bj / rel).read_text(encoding='utf-8').replace('\r\n', '\n'))

    hilo = ROOT / 'hilo'
    write(OUT / 'hilo' / 'index.html', app_page(hilo / 'index.html'))
    for rel in ('engine.js', 'app.js'):
        write(OUT / 'hilo' / rel, (hilo / rel).read_text(encoding='utf-8').replace('\r\n', '\n'))
    files = sorted(p.relative_to(OUT).as_posix() for p in OUT.rglob('*') if p.is_file())
    print('frontend: %d files, %d KB' % (len(files), sum((OUT / f).stat().st_size for f in files) // 1024))


def exe():
    env = dict(os.environ, GOOS='windows', GOARCH='amd64', CGO_ENABLED='0', GOFLAGS='-mod=readonly')

    def run(*cmd, **kw):
        subprocess.run(cmd, cwd=HERE, check=True, **kw)

    # the icon and the manifest (DPI awareness), as a resource object the Go linker picks up
    run('go', 'run', 'github.com/tc-hib/go-winres@v0.3.3', 'make', '--in', 'winres/winres.json', '--arch', 'amd64',
        env=dict(os.environ, GOFLAGS='-mod=mod'))
    (HERE / 'dist').mkdir(exist_ok=True)
    run('go', 'build', '-trimpath', '-buildvcs=false', '-tags', 'desktop,production', '-ldflags', '-s -w -H windowsgui',
        '-o', 'dist/BlackjackHiLo.exe', '.', env=env)
    out = HERE / 'dist' / 'BlackjackHiLo.exe'
    print('dist/BlackjackHiLo.exe: %.1f MB, sha256 %s' % (out.stat().st_size / 1e6, hashlib.sha256(out.read_bytes()).hexdigest()))


if __name__ == '__main__':
    frontend()
    if '--frontend' not in sys.argv:
        exe()

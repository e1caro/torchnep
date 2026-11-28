#!/usr/bin/env python3
"""Builds the desktop program: one Windows .exe holding Eighth Rank (../chess), and its installer.

    python3 build.py              assemble frontend/, cross-compile dist/EighthRank.exe (needs Go) and, when NSIS's
                                  makensis is installed, build dist/EighthRank-Setup.exe (installer/EighthRank.nsi)
    python3 build.py --frontend   only assemble frontend/ (what the tests open in a browser)

CHESS_VERSION (for example 1.12) is the version the installer shows and writes to Settings > Apps.

frontend/ is generated: the web app is copied in unchanged except that its typefaces come from fonts/ instead of the
network, and overlay/store.js and keep.js are loaded first: they keep a copy of your progress in a file of the
program's own (see main.go). The same scheme as ../desktop-poker."""
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
APP = ROOT / 'chess'
# family, weight (a range for a variable font), file in fonts/
FONTS = [
    ('Cormorant Garamond', '600', 'cormorant-garamond-latin-600-normal.woff2'),
    ('Marcellus', '400', 'marcellus-latin-400-normal.woff2'),
    ('Bodoni Moda', '600', 'bodoni-moda-latin-600-normal.woff2'),
    ('Libre Caslon Display', '400', 'libre-caslon-display-latin-400-normal.woff2'),
    ('Instrument Sans', '400 700', 'instrument-sans-latin-wght-normal.woff2'),
    ('Noto Sans Symbols 2', '400', 'noto-sans-symbols-2-symbols-400-normal.woff2'),
]
FONT_LINKS = re.compile(r'[ \t]*<link rel="preconnect"[^>]*>\n|[ \t]*<link [^>]*fonts\.googleapis\.com[^>]*>\n')
FILES = ['style.css', 'engine.js', 'content.js', 'puzzles.js', 'app.js']
STYLE = '<link rel="stylesheet" href="style.css">'


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(text.encode('utf-8'))          # bytes: the same file on every system


def page():
    """The app's index.html with the local fonts and with the overlay first in the head."""
    html = (APP / 'index.html').read_text(encoding='utf-8').replace('\r\n', '\n')
    html, n = FONT_LINKS.subn('', html)
    assert n == 4, 'font links not found in index.html (%d)' % n
    assert 'fonts.googleapis.com' not in html and 'fonts.gstatic.com' not in html
    head = '<link rel="stylesheet" href="fonts/fonts.css">\n<script src="store.js"></script>\n<script src="keep.js"></script>\n'
    assert html.count(STYLE) == 1
    return html.replace(STYLE, head + STYLE)


def frontend():
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / 'fonts').mkdir(parents=True)
    css = ''
    for family, weight, name in FONTS:
        shutil.copyfile(HERE / 'fonts' / name, OUT / 'fonts' / name)
        css += ("@font-face { font-family: '%s'; font-style: normal; font-weight: %s; font-display: swap; "
                "src: url(%s) format('woff2'); }\n" % (family, weight, name))
    shutil.copyfile(HERE / 'fonts' / 'LICENSES.txt', OUT / 'fonts' / 'LICENSES.txt')
    write(OUT / 'fonts' / 'fonts.css', css)
    for name in ('store.js', 'keep.js'):
        write(OUT / name, (HERE / 'overlay' / name).read_text(encoding='utf-8').replace('\r\n', '\n'))
    write(OUT / 'index.html', page())
    for rel in FILES:
        write(OUT / rel, (APP / rel).read_text(encoding='utf-8').replace('\r\n', '\n'))
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
        '-o', 'dist/EighthRank.exe', '.', env=env)
    out = HERE / 'dist' / 'EighthRank.exe'
    print('dist/EighthRank.exe: %.1f MB, sha256 %s' % (out.stat().st_size / 1e6, hashlib.sha256(out.read_bytes()).hexdigest()))


def installer():
    if not shutil.which('makensis'):
        print('no makensis: dist/EighthRank-Setup.exe not built (apt install nsis, or NSIS on Windows)')
        return
    version = os.environ.get('CHESS_VERSION', '1.0')
    assert re.fullmatch(r'[0-9][0-9.]*', version), 'CHESS_VERSION must be a version number: %r' % version
    subprocess.run(['makensis', '-V2', '-WX', '-DVERSION=' + version, 'installer/EighthRank.nsi'], cwd=HERE, check=True)
    out = HERE / 'dist' / 'EighthRank-Setup.exe'
    print('dist/EighthRank-Setup.exe: %.1f MB, version %s' % (out.stat().st_size / 1e6, version))


if __name__ == '__main__':
    frontend()
    if '--frontend' not in sys.argv:
        exe()
        installer()

# Poker Coach for Windows

One program, `PokerCoach.exe`, holding the web app of `../poker`: the ten lessons, the six drills, the table with its
coach and the tools. It works offline: nothing is read from or sent to the network, the typeface included.

It is a single portable file for Windows 10 and 11, nothing to install. It is not signed, so the first time Windows
SmartScreen says "Windows protected your PC": choose **More info**, then **Run anyway**. The window is drawn with the
WebView2 component that ships with Windows 11 and current Windows 10 (if it is missing, the program offers to fetch
it). Your progress lives in `%APPDATA%\PokerCoach`; deleting that folder starts again from nothing.

Your progress is kept twice there: in the window's own storage, and in `saved.json`, written a moment after every
change. Each time the program starts, the page puts back what `saved.json` holds before the app reads anything (the
same scheme as `../desktop-blackjack`). The window fills the screen the first time and afterwards opens the way you
left it; starting the program while it is open brings that window forward.

On a wide window the table has the coach beside it, with the hand so far written out under it. The keys are the web
app's: `F` fold, `C` check or call, `R` bet or raise, `1` to `6` the bet sizes, `Enter` next hand, `Esc` back.

## How it is put together

```
main.go            the window (Wails v2): shows the pages packed into the .exe, no network port; remembers how the
                   window was left (window.json next to saved.json), keeps saved.json and answers store.js with it
overlay/           store.js (a stand-in; inside the program main.go answers it) and keep.js, loaded first: they put
                   saved.json back at the start of a run and send it every change
fonts/             Archivo (SIL OFL, see fonts/LICENSES.txt), so nothing comes from the network
winres/            the icon (drawn by ../poker/tools/make-icons.js) and the Windows manifest
build.py           assembles frontend/ from ../poker, then cross-compiles dist/PokerCoach.exe
tests/selftest.js  the play-through; the .exe runs it on itself when started with POKER_SELFTEST=<log file>
tests/browser.js   runs the same play-through in Chromium against frontend/
```

`frontend/` and `dist/` are generated. The web app is copied in unchanged apart from its font links and manifest.

## Build and test

```bash
python3 build.py                      # needs Go 1.26; builds from Linux, macOS or Windows
python3 build.py --frontend           # only assemble frontend/
(cd frontend && python3 -m http.server 8766) &
node tests/browser.js http://localhost:8766/            # the play-through in Chromium (needs Playwright)
```

`.github/workflows/desktop-poker.yml` builds the .exe and then runs it on a Windows machine, where the real window
plays through itself (a lesson, a drill, the charts, the equity calculator, three hands), is closed, has its own
storage deleted and is opened again to see that your progress comes back from `saved.json`. The .exe is attached to
every run; a push to `master` (or running the workflow by hand) also publishes it as a release `poker-pc-N`.

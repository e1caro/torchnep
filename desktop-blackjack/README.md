# Blackjack & Hi-Lo for Windows

One program, `BlackjackHiLo.exe`, holding the two blackjack apps of this repository behind a home screen:

- the **Blackjack table** (`../blackjack`): the lobby of casino and online tables (Sevilla included), chips, side bets,
  animated dealing, session statistics;
- the **Hi-Lo trainer** (`../hilo`): six stages for learning to count cards, with your own house rules and bankroll.

Each has a way to the other and back to the home screen (the table's menu, the trainer's header), and each keeps its
progress on the computer. It works offline: nothing is read from or sent to the network.

It is a single portable file for Windows 10 and 11, nothing to install. It is not signed, so the first time Windows
SmartScreen says "Windows protected your PC": choose **More info**, then **Run anyway**. The window is drawn with the
WebView2 component that ships with Windows 11 and current Windows 10 (if it is missing, the program offers to fetch
it). Saved games live in `%APPDATA%\BlackjackHiLo`; deleting that folder resets both apps.

## How it is put together

```
main.go            the window (Wails v2): shows the pages packed into the .exe, no network port
home/index.html    the home screen
overlay/           desktop.css + desktop.js, added to both apps: the links between them
fonts/             the fonts of both apps (SIL OFL, see fonts/LICENSES.txt), so nothing comes from the network
winres/            the icon and the Windows manifest
build.py           assembles frontend/ from ../blackjack and ../hilo, then cross-compiles dist/BlackjackHiLo.exe
tests/smoke.js     plays through the program: in Chromium against frontend/, or against the running .exe
```

The two apps are copied in unchanged, apart from their font links. `frontend/` and `dist/` are generated.

## Build and test

```bash
python3 build.py                      # needs Go 1.26; builds from Linux, macOS or Windows
python3 build.py --frontend           # only assemble frontend/
(cd frontend && python3 -m http.server 8765) &
node tests/smoke.js --url http://localhost:8765/        # 6 checks in Chromium (needs Playwright)
```

`.github/workflows/desktop-blackjack.yml` builds the .exe and then runs it on a Windows machine, driving the real
window through the same six checks, closing it and opening it again to see that the saved games are still there. The
.exe is attached to the workflow run; nothing is released.

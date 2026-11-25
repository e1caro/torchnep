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

## What the PC adds

| Key | What it does |
| --- | --- |
| `Ctrl+K` | Every command by name: type a few letters, `Enter`. Also the **Commands** button in a corner of both apps. |
| `F1` or `?` | The keys of the page you are on. |
| `F11` | Full screen, and back. |
| `Ctrl+T` | Keeps the window on top of the others (a trainer next to a video, say), and lets go. |
| `Ctrl` with `+` `-` `0`, or with the mouse wheel | Everything bigger, smaller, normal size (until the program is closed). |
| `Ctrl+1` `Ctrl+2` `Ctrl+H` | Blackjack table, Hi-Lo trainer, home screen. |
| `1` to `6` at the table | Puts that chip of the tray on the bet; each chip shows its number. |
| `M` `T` `K` at the table | The menu, the statistics, the card count shown or hidden. |
| `Alt+1` to `Alt+8` in the trainer | Its sections, from the plan to the rules. |
| `Enter` on the home screen | Back to the app you used last; `1` and `2` open either. |

The home screen also shows where you stand (your seat and chips, sessions, hands and time at the tables, the drills
passed) and has **Back up your games** and **Restore a backup**: every saved game in one `.json` file, to keep or to
carry to another computer. The window opens the way you left it (its size, maximised or full screen), and starting
the program while it is open brings that window forward.

## How it is put together

```
main.go            the window (Wails v2): shows the pages packed into the .exe, no network port; remembers how
                   the window was left (window.json next to the saved games) and opens the backup file dialogs
home/index.html    the home screen
overlay/           desktop.css + desktop.js, added to the home screen and both apps: the links between them and
                   everything under "What the PC adds" (the table's own controls are pressed for it)
fonts/             the fonts of both apps (SIL OFL, see fonts/LICENSES.txt), so nothing comes from the network
winres/            the icon and the Windows manifest
build.py           assembles frontend/ from ../blackjack and ../hilo, then cross-compiles dist/BlackjackHiLo.exe
tests/selftest.js  the play-through; the .exe runs it on itself when started with BJHILO_SELFTEST=<log file>
tests/browser.js   runs the same play-through in Chromium against frontend/
```

The two apps are copied in unchanged, apart from their font links. `frontend/` and `dist/` are generated. The
play-through covers the desktop layer too; the file dialogs of a backup and the zoom are the two things it cannot
reach.

## Build and test

```bash
python3 build.py                      # needs Go 1.26; builds from Linux, macOS or Windows
python3 build.py --frontend           # only assemble frontend/
(cd frontend && python3 -m http.server 8765) &
node tests/browser.js http://localhost:8765/            # the play-through in Chromium (needs Playwright)
```

`.github/workflows/desktop-blackjack.yml` builds the .exe and then runs it on a Windows machine, where the real
window plays through itself, is closed and opened again to see that the saved games are still there. The .exe is
attached to the workflow run; nothing is released.

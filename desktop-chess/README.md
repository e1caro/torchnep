# Eighth Rank for Windows

The chess course in [`../chess`](../chess) as a Windows program: one `EighthRank.exe`, and an installer for it.
Built the same way as [`../desktop-poker`](../desktop-poker).

## Get it

Releases named **Eighth Rank for Windows** (tags `chess-pc-N`) carry two files:

- `EighthRank-Setup.exe` installs for the current user only (no administrator), adds Start menu and desktop
  shortcuts, and lists the program in Settings > Apps.
- `EighthRank.exe` is the same program as one portable file.

Neither file is signed, so Windows SmartScreen asks once: **More info**, then **Run anyway**.
Progress is kept in `%APPDATA%\EighthRank` and survives updates and uninstalling.

## How it is made

- `main.go`: a native window (Wails, WebView2) showing the pages packed into the program. No network port, nothing
  read from the network.
- `build.py`: assembles `frontend/` from `../chess` (fonts from `fonts/` instead of the network, plus the two
  overlay scripts), cross-compiles the `.exe` with Go and builds the installer with NSIS.
- `overlay/keep.js`, `overlay/store.js`: a second copy of your progress in `saved.json`, restored on each start.
- `tests/selftest.js`: the program plays through itself (start screen, a lesson, a puzzle, an opening line, three
  moves against the computer, a change of style) when started with `CHESS_SELFTEST=<log file>`.
- `fonts/`: the typefaces of the four styles and the chess pieces, with their licences.

## Build

```
python3 build.py              # needs Go; the installer also needs makensis
python3 build.py --frontend   # only frontend/, to open in a browser
```

The workflow `.github/workflows/desktop-chess.yml` builds on Linux, runs the play-through and the installer on
Windows, and publishes a release on pushes to master.

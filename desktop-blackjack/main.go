// Blackjack & Hi-Lo: the Blackjack table and the Hi-Lo trainer in one window.
//
// The program is a native window showing the pages packed into it (frontend/, assembled by build.py) with the
// WebView2 component that ships with Windows 10 and 11. It opens no network port and reads nothing from the
// network; the games keep their progress in the window's own storage under %APPDATA%\BlackjackHiLo.
//
// The window comes back the way it was left (its size, maximised or full screen: window.json next to the saved
// games), a second start brings the open window forward instead, and the pages reach two things through Desk: a
// file to save a backup of the games to, and one to read it back from (overlay/desktop.js).
//
// Started with BJHILO_SELFTEST=<log file> it plays through itself (tests/selftest.js), writes what it found to that
// file and exits with the number of failures; BJHILO_SELFTEST_MODE=restart only checks what an earlier run saved.
package main

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend
var packed embed.FS

//go:embed tests/selftest.js
var selfTestJS string

// SelfTest is what the play-through script reports to (window.go.main.SelfTest in the page).
type SelfTest struct {
	ctx    context.Context
	out    *os.File
	failed int
}

// Report writes one line of the play-through to the log.
func (s *SelfTest) Report(line string) {
	fmt.Fprintln(s.out, line)
	_ = s.out.Sync()
}

// Done ends the play-through: the window closes as if a person had closed it.
func (s *SelfTest) Done(failed int) {
	s.failed = failed
	s.Report(fmt.Sprintf("RESULT %d failed", failed))
	runtime.Quit(s.ctx)
}

// Desk is what the desktop layer of the pages asks the program for (window.go.main.Desk in the page).
type Desk struct {
	ctx context.Context
}

var backupFiles = []runtime.FileFilter{{DisplayName: "Backup of your games (*.json)", Pattern: "*.json"}}

// SaveBackup asks where to keep a backup and writes it there. It answers the file's path, or "" when the person
// changed their mind.
func (d *Desk) SaveBackup(text string) (string, error) {
	path, err := runtime.SaveFileDialog(d.ctx, runtime.SaveDialogOptions{
		Title:           "Save a backup of your games",
		DefaultFilename: "BlackjackHiLo-backup-" + time.Now().Format("2006-01-02") + ".json",
		Filters:         backupFiles,
	})
	if err != nil || path == "" {
		return "", err
	}
	if filepath.Ext(path) == "" {
		path += ".json"
	}
	if err := os.WriteFile(path, []byte(text), 0o644); err != nil {
		return "", err
	}
	return path, nil
}

// OpenBackup asks for a backup file and answers what is in it, or "" when the person changed their mind. The page
// checks that it is a backup before anything is replaced.
func (d *Desk) OpenBackup() (string, error) {
	path, err := runtime.OpenFileDialog(d.ctx, runtime.OpenDialogOptions{Title: "Choose a backup of your games", Filters: backupFiles})
	if err != nil || path == "" {
		return "", err
	}
	info, err := os.Stat(path)
	if err != nil {
		return "", err
	}
	if info.Size() > 16<<20 {
		return "", errors.New("that file is too big to be a backup")
	}
	text, err := os.ReadFile(path)
	if err != nil {
		return "", err
	}
	return string(text), nil
}

// windowState is how the window was left, kept in window.json next to the saved games.
type windowState struct {
	Width      int  `json:"width"`
	Height     int  `json:"height"`
	Maximised  bool `json:"maximised"`
	Fullscreen bool `json:"fullscreen"`
}

const (
	defaultWidth, defaultHeight = 1280, 880
	minWidth, minHeight         = 380, 620
)

// readWindow answers how the window was left, or the first-run window when nothing sensible was kept.
func readWindow(file string) windowState {
	st := windowState{Width: defaultWidth, Height: defaultHeight}
	text, err := os.ReadFile(file)
	if err != nil {
		return st
	}
	var kept windowState
	if json.Unmarshal(text, &kept) != nil {
		return st
	}
	if kept.Width >= minWidth && kept.Width <= 10000 && kept.Height >= minHeight && kept.Height <= 10000 {
		st.Width, st.Height = kept.Width, kept.Height
	}
	st.Maximised, st.Fullscreen = kept.Maximised, kept.Fullscreen
	return st
}

// keepWindow writes how the window is being left. A maximised or full-screen window keeps the size it had before.
func keepWindow(ctx context.Context, file string, was windowState) {
	st := windowState{Width: was.Width, Height: was.Height, Fullscreen: runtime.WindowIsFullscreen(ctx)}
	st.Maximised = !st.Fullscreen && runtime.WindowIsMaximised(ctx)
	if !st.Fullscreen && !st.Maximised && !runtime.WindowIsMinimised(ctx) {
		if w, h := runtime.WindowGetSize(ctx); w >= minWidth && h >= minHeight {
			st.Width, st.Height = w, h
		}
	}
	if text, err := json.Marshal(st); err == nil {
		_ = os.MkdirAll(filepath.Dir(file), 0o755)
		_ = os.WriteFile(file, text, 0o644)
	}
}

func main() {
	pages, err := fs.Sub(packed, "frontend")
	if err != nil {
		log.Fatal(err)
	}
	// A fixed place for saved games, so that renaming or moving the .exe does not lose them.
	data := ""
	if dir, err := os.UserConfigDir(); err == nil {
		data = filepath.Join(dir, "BlackjackHiLo")
	}
	testing := os.Getenv("BJHILO_SELFTEST") != ""
	windowFile := ""
	if data != "" && !testing { // a play-through always gets the first-run window, and leaves no trace of its own
		windowFile = filepath.Join(data, "window.json")
	}
	window := windowState{Width: defaultWidth, Height: defaultHeight}
	if windowFile != "" {
		window = readWindow(windowFile)
	}
	start := options.Normal
	if window.Fullscreen {
		start = options.Fullscreen
	} else if window.Maximised {
		start = options.Maximised
	}

	desk := &Desk{}
	app := &options.App{
		Title:            "Blackjack & Hi-Lo",
		Width:            window.Width,
		Height:           window.Height,
		MinWidth:         minWidth,
		MinHeight:        minHeight,
		WindowStartState: start,
		BackgroundColour: &options.RGBA{R: 11, G: 61, B: 44, A: 255},
		AssetServer:      &assetserver.Options{Assets: pages},
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId: "e1caro-blackjack-hilo-6c1f0c1e",
			// Started again while it is open (the shortcut, twice): the window that is there comes forward.
			OnSecondInstanceLaunch: func(options.SecondInstanceData) {
				if desk.ctx != nil {
					runtime.WindowUnminimise(desk.ctx)
					runtime.Show(desk.ctx)
				}
			},
		},
		Windows: &windows.Options{
			WebviewUserDataPath: data,
			Theme:               windows.Dark,
			// Ctrl with + and -, or with the mouse wheel, makes everything bigger or smaller; Ctrl+0 is the normal size.
			ZoomFactor:           1.0,
			IsZoomControlEnabled: true,
		},
		Bind:      []interface{}{desk},
		OnStartup: func(ctx context.Context) { desk.ctx = ctx },
	}
	if windowFile != "" {
		app.OnBeforeClose = func(ctx context.Context) bool {
			keepWindow(ctx, windowFile, window)
			return false
		}
	}

	var test *SelfTest
	if path := os.Getenv("BJHILO_SELFTEST"); path != "" {
		out, err := os.Create(path)
		if err != nil {
			log.Fatal(err)
		}
		test = &SelfTest{out: out}
		mode := os.Getenv("BJHILO_SELFTEST_MODE")
		test.Report("started (" + mode + ")")
		app.Bind = []interface{}{test, desk}
		app.OnStartup = func(ctx context.Context) {
			desk.ctx = ctx
			test.ctx = ctx
			time.AfterFunc(6*time.Minute, func() { // never hang a test run
				test.Report("RESULT timed out")
				os.Exit(3)
			})
		}
		app.OnDomReady = func(ctx context.Context) {
			runtime.WindowExecJS(ctx, "window.__selftestMode="+strconv.Quote(mode)+";"+selfTestJS)
		}
	}

	if err := wails.Run(app); err != nil {
		if test != nil {
			test.Report("RESULT the window failed: " + err.Error())
			os.Exit(2)
		}
		log.Fatal(err)
	}
	if test != nil {
		os.Exit(test.failed)
	}
}

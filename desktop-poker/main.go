// Poker Coach: the lessons, drills, table and tools of ../poker in a window of their own.
//
// The program is a native window showing the pages packed into it (frontend/, assembled by build.py) with the
// WebView2 component that ships with Windows 10 and 11. It opens no network port and reads nothing from the
// network; the app keeps your progress in the window's own storage under %APPDATA%\PokerCoach, and in saved.json
// there as well: that storage did not always survive closing a program, so every change is also written to the
// file (Desk.SaveStore) and the first page of each run puts it back (store.js, overlay/keep.js). The same scheme as
// ../desktop-blackjack.
//
// The window fills the screen the first time and afterwards comes back the way it was left (its size, maximised or
// full screen: window.json next to the saved progress), and a second start brings the open window forward instead.
//
// Started with POKER_SELFTEST=<log file> it plays through itself (tests/selftest.js), writes what it found to that
// file and exits with the number of failures; POKER_SELFTEST_MODE=restart only checks what an earlier run saved.
package main

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"sync"
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

// Desk is what the pages ask the program for (window.go.main.Desk in the page).
type Desk struct {
	ctx   context.Context
	store string     // saved.json: the copy of your progress kept on disk ("" when there is no place for it)
	mu    sync.Mutex // one write of saved.json at a time
}

// storeText is what store.js hands the first page: the copy of your progress, or null when there is none to give.
type storeText struct {
	App   string            `json:"app"`
	Games map[string]string `json:"games"`
}

// SaveStore writes the progress the page sent (keep.js) to saved.json: whole or not at all, by way of a file next
// to it that then takes its place.
func (d *Desk) SaveStore(text string) error {
	if d.store == "" {
		return nil
	}
	if len(text) > 32<<20 {
		return errors.New("too big to keep")
	}
	var s storeText
	if err := json.Unmarshal([]byte(text), &s); err != nil || s.App != "PokerCoach" || s.Games == nil {
		return errors.New("not the progress of this program")
	}
	d.mu.Lock()
	defer d.mu.Unlock()
	if err := os.MkdirAll(filepath.Dir(d.store), 0o755); err != nil {
		return err
	}
	tmp := d.store + ".new"
	if err := os.WriteFile(tmp, []byte(text), 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, d.store)
}

// storeJS answers /store.js: an id of this run and the copy on disk, for keep.js on the first page of the run.
func (d *Desk) storeJS(run string) []byte {
	kept := []byte("null")
	if d.store != "" {
		d.mu.Lock()
		text, err := os.ReadFile(d.store)
		d.mu.Unlock()
		var s storeText
		if err == nil && json.Unmarshal(text, &s) == nil && s.App == "PokerCoach" && s.Games != nil {
			kept = text
		}
	}
	return []byte("window.__deskRun=" + strconv.Quote(run) + ";\nwindow.__deskStore=" + string(kept) + ";\n")
}

// windowState is how the window was left, kept in window.json next to the saved progress.
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

// readWindow answers how the window was left. The first time there is nothing to read: the window then fills the
// screen, where the table has room for its coach beside it.
func readWindow(file string) windowState {
	st := windowState{Width: defaultWidth, Height: defaultHeight}
	text, err := os.ReadFile(file)
	if err != nil {
		st.Maximised = true
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
	// A fixed place for your progress, so that renaming or moving the .exe does not lose it.
	data := ""
	if dir, err := os.UserConfigDir(); err == nil {
		data = filepath.Join(dir, "PokerCoach")
	}
	testing := os.Getenv("POKER_SELFTEST") != ""
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
	if data != "" {
		desk.store = filepath.Join(data, "saved.json")
	}
	run := strconv.FormatInt(time.Now().UnixNano(), 36)
	// store.js comes from the program itself, never from the pages packed into it.
	keepStore := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Path != "/store.js" {
				next.ServeHTTP(w, r)
				return
			}
			w.Header().Set("Content-Type", "text/javascript; charset=utf-8")
			w.Header().Set("Cache-Control", "no-store")
			_, _ = w.Write(desk.storeJS(run))
		})
	}
	app := &options.App{
		Title:            "Poker Coach",
		Width:            window.Width,
		Height:           window.Height,
		MinWidth:         minWidth,
		MinHeight:        minHeight,
		WindowStartState: start,
		BackgroundColour: &options.RGBA{R: 14, G: 36, B: 48, A: 255},
		AssetServer:      &assetserver.Options{Assets: pages, Middleware: keepStore},
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId: "e1caro-poker-coach-4b2d9a71",
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
	if path := os.Getenv("POKER_SELFTEST"); path != "" {
		out, err := os.Create(path)
		if err != nil {
			log.Fatal(err)
		}
		test = &SelfTest{out: out}
		mode := os.Getenv("POKER_SELFTEST_MODE")
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

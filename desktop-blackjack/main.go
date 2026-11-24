// Blackjack & Hi-Lo: the Blackjack table and the Hi-Lo trainer in one window.
//
// The program is a native window showing the pages packed into it (frontend/, assembled by build.py) with the
// WebView2 component that ships with Windows 10 and 11. It opens no network port and reads nothing from the
// network; the games keep their progress in the window's own storage under %APPDATA%\BlackjackHiLo.
//
// Started with BJHILO_SELFTEST=<log file> it plays through itself (tests/selftest.js), writes what it found to that
// file and exits with the number of failures; BJHILO_SELFTEST_MODE=restart only checks what an earlier run saved.
package main

import (
	"context"
	"embed"
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
	app := &options.App{
		Title:            "Blackjack & Hi-Lo",
		Width:            1280,
		Height:           880,
		MinWidth:         380,
		MinHeight:        620,
		BackgroundColour: &options.RGBA{R: 11, G: 61, B: 44, A: 255},
		AssetServer:      &assetserver.Options{Assets: pages},
		SingleInstanceLock: &options.SingleInstanceLock{
			UniqueId: "e1caro-blackjack-hilo-6c1f0c1e",
		},
		Windows: &windows.Options{
			WebviewUserDataPath: data,
			Theme:               windows.Dark,
		},
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
		app.Bind = []interface{}{test}
		app.OnStartup = func(ctx context.Context) {
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

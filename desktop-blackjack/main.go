// Blackjack & Hi-Lo: the Blackjack table and the Hi-Lo trainer in one window.
//
// The program is a native window showing the pages packed into it (frontend/, assembled by build.py) with the
// WebView2 component that ships with Windows 10 and 11. It opens no network port and reads nothing from the
// network; the games keep their progress in the window's own storage under %APPDATA%\BlackjackHiLo.
package main

import (
	"embed"
	"io/fs"
	"log"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend
var packed embed.FS

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
	err = wails.Run(&options.App{
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
	})
	if err != nil {
		log.Fatal(err)
	}
}

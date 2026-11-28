# Eighth Rank for Android

The chess course in [`../chess`](../chess) as an Android app, built the same way as [`../android-poker`](../android-poker):
a small native shell (`MainActivity.java`) shows the web app packed inside the APK, full screen and offline.

- Releases named **Eighth Rank 1.N** (tags `chess-N`) carry the APK. Download it on the phone, open it and allow
  "Install unknown apps" for your browser when asked.
- Each release also carries `web.zip`: installed apps download it by themselves and show it the next time they open,
  so the APK only needs reinstalling when the native shell changes (`shell-S`).
- The pages come from `../desktop-chess/build.py --frontend`, which is `../chess` with the fonts of
  `../desktop-chess/fonts` in place of the network ones.
- Progress lives in the app's own storage and survives updates.

The workflow `.github/workflows/android-chess.yml` builds and signs the APK (the repository's sideload key).

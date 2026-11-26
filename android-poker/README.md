# Poker Coach for Android

A small native shell (one `MainActivity`) around the web app in `../poker`, the same scheme as `../android-blackjack`
and `../android-kaidoneta`.

- The whole web app is copied into the APK (`assets/www`) at build time and shown full screen, in portrait, from
  `https://appassets.androidplatform.net`, a secure origin the app serves itself: storage works exactly like on the
  web, so the lessons you finished, your drill records, the table in play and your hand history are kept, and it
  works offline. Links to other sites open in the browser.
- *Back* closes an open sheet, goes from a lesson, drill or tool back to its list, then to Learn, and leaves the app
  from there (`window.PokerApp.back()` in the web app). The shell adds a clipboard as `window.PokerNative.copy`.
- The network is used only to look for a newer version of the web app (and for the typeface; without it the app uses
  the phone's own).

## Build

CI does it: `.github/workflows/android-poker.yml` runs the engine's unit tests, then builds the APK. Pushes to
`claude/**` and `ccr-**` branches and pull requests build a check APK (downloadable from the run's artifacts); a push
to master that touches the app, or running the workflow by hand, publishes a release `poker-N` with
`PokerCoach-1.N.apk`. Locally, with the Android SDK and Gradle 8.13:

```bash
mkdir -p android-poker/app/src/main/assets/www
rsync -a --delete --exclude tests --exclude tools --exclude README.md poker/ android-poker/app/src/main/assets/www/
gradle -p android-poker assembleDebug
```

Launcher icons (square and round mipmaps, the adaptive layers and the one-colour layer for themed icons) are drawn
with the web icons by `node poker/tools/make-icons.js`.

## Updating

The app updates itself. Every release `poker-N` carries `web.zip`, the whole web app; the app looks for a newer one
when it opens (at most every 10 minutes), downloads it in the background into its own storage and shows it the next
time it comes back to the screen. Only a change to this native shell (or its launcher icon) needs a new APK: raise
`pokerShell` in `app/build.gradle` for shell changes, and releases marked with that `shell-S` are skipped by older
shells. Installing a newer APK over the old one keeps the data (same signing key: the repository's `FITQUEST_KEYSTORE`
secret).

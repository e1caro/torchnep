# Blackjack Table for Android

A small native shell (one `MainActivity`) around the web app in `../blackjack`, the same scheme as
`../android-kaidoneta` and `../android-bloomdoku`.

- The whole web app is copied into the APK (`assets/www`) at build time and shown full screen, in portrait, from
  `https://appassets.androidplatform.net`, a secure origin the app serves itself: storage works exactly like on the
  web, so the game in play, the session history and your saved tables are kept, and it plays offline. Links to other
  sites open in the browser.
- *Back* closes an open sheet (menu, statistics) and leaves the app from the table. The shell adds a clipboard as
  `window.BlackjackNative.copy`, used by *Copy as CSV* in the session history.
- The network is used only to look for a newer version of the web app (and for the typefaces; without them the
  table uses the phone's own).

## Build

CI does it: `.github/workflows/android-blackjack.yml` runs the game's unit tests, then builds the APK. Pushes to
`claude/**` and `ccr-**` branches and pull requests build a check APK (downloadable from the run's artifacts); a push
to master that touches the app, or running the workflow by hand, publishes a release `blackjack-N` with
`Blackjack-1.N.apk`. Locally, with the Android SDK and Gradle 8.13:

```bash
mkdir -p android-blackjack/app/src/main/assets/www
rsync -a --delete --exclude tests --exclude tools --exclude README.md blackjack/ android-blackjack/app/src/main/assets/www/
gradle -p android-blackjack assembleDebug
```

Launcher icons (square and round mipmaps, the adaptive layers and the one-colour layer for themed icons) are drawn
with the web icons by `node blackjack/tools/make-icons.js`.

## Updating

The app updates itself. Every release `blackjack-N` carries `web.zip`, the whole web app; the app looks for a newer
one when it opens (at most every 10 minutes), downloads it in the background into its own storage and shows it the
next time it comes back to the screen. Only a change to this native shell (or its launcher icon) needs a new APK:
raise `blackjackShell` in `app/build.gradle` for shell changes, and releases marked with that `shell-S` are skipped by
older shells. Installing a newer APK over the old one keeps the data (same signing key: the repository's
`FITQUEST_KEYSTORE` secret).

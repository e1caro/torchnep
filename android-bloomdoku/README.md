# Bloomdoku for Android

A small native shell (one `MainActivity`) around the web app in `../bloomdoku`, the same scheme as
`../android-analyst`.

- The whole web app is copied into the APK (`assets/www`) at build time and shown full screen, in portrait, from
  `https://appassets.androidplatform.net`, a secure origin the app serves itself: storage and fetch work exactly
  like on the web and the game needs no network. Links to other sites open in the browser.
- A WebView has no share sheet and no clipboard of its own, so the shell adds them, and a short vibration
  (`window.BloomNative`, used as `BD.native` in `js/app.js` and `js/sound.js`). *Back* closes an open sheet, then
  goes to the previous page, and leaves the app from the first one.
- The network is used only for the account (sync, friends and messages, if you sign in: HTTPS calls to Supabase
  from `js/cloud.js`) and for looking for a newer version of the web app.

## Build

CI does it: `.github/workflows/android-bloomdoku.yml` runs the web app's tests, then builds the APK. Pull requests
build a check APK (downloadable from the run's artifacts); a push to master or running the workflow by hand
publishes a release `bloomdoku-N` with `Bloomdoku-1.N.apk`. Locally, with the Android SDK and Gradle 8.13:

```bash
mkdir -p android-bloomdoku/app/src/main/assets/www
rsync -a --delete --exclude tests --exclude tools --exclude README.md --exclude sw.js bloomdoku/ android-bloomdoku/app/src/main/assets/www/
gradle -p android-bloomdoku assembleDebug
```

Launcher icons (adaptive foreground and background, the themed one-colour layer for Android 13+, square and round
mipmaps) are generated from the drawing in `bloomdoku/tools/make-icons.js` by `node bloomdoku/tools/make-icons.js`.

## Updating

The app updates itself. Every release `bloomdoku-N` carries `web.zip`, the whole web app; the app looks for a newer
one when it opens (at most every 10 minutes), downloads it in the background into its own storage and shows it the
next time it comes back to the screen. Progress is kept. Only a change to this native shell needs a new APK: raise
`bloomShell` in `app/build.gradle`, and releases marked with that `shell-S` are skipped by older shells. Installing a
newer APK over the old one keeps the data (same signing key: the repository's `FITQUEST_KEYSTORE` secret).

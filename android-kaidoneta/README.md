# Kaidoneta for Android

A small native shell (one `MainActivity`) around the web app in `../kaidoneta`, the same scheme as
`../android-bloomdoku`.

- The whole web app is copied into the APK (`assets/www`) at build time and shown full screen, in portrait, from
  `https://appassets.androidplatform.net`, a secure origin the app serves itself: storage and fetch work exactly
  like on the web, and it needs no network. Links to other sites open in the browser.
- A WebView has no share sheet of its own, so the shell adds one (for links and for the wanted-poster picture), the
  clipboard and vibration as `window.KaidoNative`; `kaidoneta/js/native.js` plugs them into `navigator.share`,
  `navigator.vibrate` and `navigator.clipboard`. *Back* closes an open sheet, then goes back, and leaves the app.
- The network is used only for the online crew (HTTPS calls to Supabase from `kaidoneta/js/cloud.js`) and for looking
  for a newer version of the web app.

## Build

CI does it: `.github/workflows/android-kaidoneta.yml` runs the web app's tests, then builds the APK. Pushes to
`claude/**` branches and pull requests build a check APK (downloadable from the run's artifacts); a push to master
that touches the app, or running the workflow by hand, publishes a release `kaidoneta-N` with `Kaidoneta-1.N.apk`.
Locally, with the Android SDK and Gradle 8.13:

```bash
mkdir -p android-kaidoneta/app/src/main/assets/www
rsync -a --delete --exclude tests --exclude tools --exclude README.md --exclude sw.js kaidoneta/ android-kaidoneta/app/src/main/assets/www/
gradle -p android-kaidoneta assembleDebug
```

Launcher icons (adaptive layers, the themed one-colour layer for Android 13+, square and round mipmaps) are generated
with the web icons by `node kaidoneta/tools/make-icons.js`.

## Updating

The app updates itself. Every release `kaidoneta-N` carries `web.zip`, the whole web app; the app looks for a newer
one when it opens (at most every 10 minutes), downloads it in the background into its own storage and shows it the
next time it comes back to the screen. The crew's data is kept. Only a change to this native shell (or its launcher
icon) needs a new APK: raise `kaidoShell` in `app/build.gradle` for shell changes, and releases marked with that
`shell-S` are skipped by older shells. Installing a newer APK over the old one keeps the data (same signing key: the
repository's `FITQUEST_KEYSTORE` secret).

# Data Analyst Path for Android

A small native shell (one `MainActivity`, about 250 lines) around the web app in `../data-analyst-path`.

- The whole web app is copied into the APK (`assets/www`) at build time and shown full screen from
  `https://appassets.androidplatform.net`, a secure origin the app serves itself: storage, fetch and WebAssembly
  (the SQL Lab) work exactly like on the web, with no network. Links to other sites open in the browser.
- A WebView cannot save files, copy, share, pick files or show `confirm()` boxes on its own, so the shell adds
  them (`window.AnalystNative`, used by `ui.native()` in `js/ui.js`): the system "save as" screen for CSV and backups,
  the calendar for the daily reminder, the clipboard and share sheet for the progress code, a file picker for import.
- An optional **daily notification** (Settings in the app): one local notification a day at the chosen time, scheduled on the phone
  (`Reminder`, `ReminderReceiver`, `BootReceiver`; no server, no exact-alarm permission). Android 13+ asks for permission the first time.
- It makes no network requests of its own. Progress stays on the phone unless you sign in under Settings → *Sync phone
  and computer*: then the web code (`js/cloud.js`) keeps it in sync with the web version through the account
  (HTTPS calls to Supabase; the INTERNET permission is already there). The transfer code still works without an account.

## Build

CI does it: `.github/workflows/android-analyst.yml` (pull requests build a check APK; running the workflow by hand
publishes a release `analyst-N` with the APK). Locally, with the Android SDK and Gradle 8.13:

```bash
mkdir -p android-analyst/app/src/main/assets/www
rsync -a --delete --exclude tests --exclude tools --exclude README.md --exclude sw.js data-analyst-path/ android-analyst/app/src/main/assets/www/
gradle -p android-analyst assembleDebug
```

Launcher icons are generated from `data-analyst-path/icons/icon.svg` by `node data-analyst-path/tools/make-icons.js`.

## Updating

There is no self-update: install the newer APK over the old one (same signing key, so the data is kept).

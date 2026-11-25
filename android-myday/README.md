# My Day (Android widget)

A home-screen widget showing today's calendar events, to-dos and notes, plus an app
screen where you can tell Claude what to add or change.

- Events are read from and written to the phone's calendar (Google Calendar or any other
  synced account), so anything added to that calendar elsewhere shows up in the widget.
- To-dos and notes are stored on the phone only.
- "Tell Claude" calls the Claude Messages API with a key you paste under Settings. The key
  is encrypted with the Android Keystore and never leaves the phone except to call the API.
  Each message sends the next two weeks of event titles, your open to-dos and your notes.
- The widget has six styles (Sky, Calendar, Glass, Midnight, Emerald, Minimal), defined in
  `Style.java` and chosen under "Widget style" in the app. The picker draws each preview from
  the same layouts and code as the real widget.

## How the widget stays current

A widget cannot watch anything by itself, and phones hold background apps back, so `DayWidget`
redraws on several routes at once:

- the calendar provider's change broadcast (`PROVIDER_CHANGED`), delivered even while the app is
  in the background: the main route when an event is added, changed or deleted;
- a content-trigger job on the calendar (`CalendarJob`), which Android may delay for apps that
  are rarely opened;
- an alarm at the next event boundary, and in any case every 15 minutes while the phone is awake;
- the phone's own half-hourly widget update;
- the round-arrow button on the widget.

Settings in the app shows when the widget last refreshed by itself and why. On phones that
restrict background apps hard (Xiaomi among them) the app needs Autostart and unrestricted
battery use for the first three routes.

## Releases and self-update

`.github/workflows/android-myday.yml` builds the APK on every push that touches this folder.
On `master` (or when run by hand) it publishes a release "My Day 1.N", tagged `myday-N`, where
N is also the APK's version code.

The app reads the repository's public list of releases (`Updates.java`), and when a `myday-N`
newer than itself exists it downloads the APK and hands it to Android's installer
(`Updater.java`). It looks when the app is opened and twice a day in the background
(`UpdateJob.java`). Android asks the person to confirm at least the first time; when that
happens in the background, the widget shows a line to tap.

Every release is signed with the repository's sideload key (the `FITQUEST_KEYSTORE` secret),
so each one installs over the previous one. An APK signed with any other key, such as one
built locally, cannot be updated by a release: uninstall it first.

## Build

No Gradle or Android Studio needed; the app has no libraries.

    ANDROID_JAR=$ANDROID_HOME/platforms/android-34/android.jar \
    BUILD_TOOLS=$ANDROID_HOME/build-tools/<version> ./build.sh

The result is `build/MyDay.apk`. `build.sh` lists its other settings (version, signing key).
It also runs with the tools Debian and Ubuntu package (`apt-get install aapt apksigner
zipalign dalvik-exchange android-sdk-platform-23`) and Robolectric's `android-all` jar as
`ANDROID_JAR`; that route uses the older `dx`, which is why the code has no lambdas.

## Checks

- `tools/check.sh`: JVM checks for the date logic, the styles, the Claude request and reply
  handling, and picking the newer release.
- `tools/device-check.sh`: on an emulator, opens the app (it must not crash and must draw every
  widget style), then shows the real widget through `WidgetHostActivity` and adds and deletes a
  calendar event under it: the widget must follow, also with the app's process gone. The
  workflow runs it before any release.

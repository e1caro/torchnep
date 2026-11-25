#!/usr/bin/env bash
# Runs on an Android emulator (see .github/workflows/android-myday.yml): installs the APK, opens the app and
# fails if it crashes, logs an error, or cannot draw a widget style. Screenshots and the log go to device-out/.
#   device-check.sh path/to/MyDay.apk
set -uo pipefail
APK=${1:?the APK to test}
OUT=${2:-device-out}
PKG=app.myday.widget
mkdir -p "$OUT"

adb install -r "$APK" || exit 1
adb shell pm grant "$PKG" android.permission.READ_CALENDAR
adb shell pm grant "$PKG" android.permission.WRITE_CALENDAR
adb logcat -c
adb shell am start -W -n "$PKG/.MainActivity" || exit 1
sleep 8
adb exec-out screencap -p > "$OUT/1-app.png"

SIZE=$(adb shell wm size | grep -oE '[0-9]+x[0-9]+' | tail -1)
W=${SIZE%x*}; H=${SIZE#*x}
for i in 1 2; do
  adb shell input swipe $((W / 2)) $((H * 8 / 10)) $((W / 2)) $((H * 2 / 10)) 400
  sleep 2
  adb exec-out screencap -p > "$OUT/$((i + 1))-scrolled.png"
done

adb logcat -d > "$OUT/logcat.txt"
FAIL=0
if grep -E "FATAL EXCEPTION" -A 12 "$OUT/logcat.txt" | grep -q "$PKG"; then
  echo "::error::My Day crashed"; grep -E "FATAL EXCEPTION" -A 25 "$OUT/logcat.txt" | head -60; FAIL=1
fi
if grep -E " E MyDay *:" "$OUT/logcat.txt"; then
  echo "::error::My Day logged an error (a widget style or the calendar query failed)"; FAIL=1
fi
if ! adb shell pidof "$PKG" > /dev/null; then
  echo "::error::My Day is not running after being opened"; FAIL=1
fi
[ "$FAIL" = 0 ] && echo "My Day opened and drew every widget style without errors"
exit "$FAIL"

#!/usr/bin/env bash
# Runs on an Android emulator (see .github/workflows/android-myday.yml). Screenshots and logs go to device-out/.
#   device-check.sh path/to/MyDay.apk
#
# 1. Installs the APK and opens the app: it must not crash, and must draw every widget style.
# 2. Shows the real widget (hosted inside the app by WidgetHostActivity) and changes the calendar under it:
#    an event added must appear in the widget, and disappear again when deleted.
# 3. Sends the app to the background, ends its process and changes the calendar once more: the app must still
#    hear about it, since that is the state it is in on a phone when someone edits their calendar.
set -uo pipefail
APK=${1:?the APK to test}
OUT=${2:-device-out}
PKG=app.myday.widget
mkdir -p "$OUT"
: > "$OUT/logcat.txt"
FAIL=0

fail() { echo "::error::$1"; FAIL=1; }
shot() { adb exec-out screencap -p > "$OUT/$1.png"; }
# Keeps what was logged so far and starts a clean log for the next step.
next_step() { adb logcat -d >> "$OUT/logcat.txt"; adb logcat -c; }
# wait_for "text" seconds: true once the app has logged the text.
wait_for() {
  local waited=0
  while [ "$waited" -lt "$2" ]; do
    if adb logcat -d -s MyDay | grep -q "$1"; then return 0; fi
    sleep 2; waited=$((waited + 2))
  done
  return 1
}
add_event() {
  local now start end
  now=$(adb shell date +%s | tr -d '\r')
  start=$(((now - 600) * 1000)); end=$(((now + 3000) * 1000))
  adb shell "content insert --uri content://com.android.calendar/events --bind calendar_id:i:$CAL \
    --bind title:s:$1 --bind dtstart:l:$start --bind dtend:l:$end --bind eventTimezone:s:UTC"
}

# ---- 1. the app ----
adb install -r "$APK" || exit 1
adb shell pm grant "$PKG" android.permission.READ_CALENDAR
adb shell pm grant "$PKG" android.permission.WRITE_CALENDAR
adb logcat -c
adb shell am start -W -n "$PKG/.MainActivity" || exit 1
sleep 8
shot 1-app
adb shell pidof "$PKG" > /dev/null || fail "My Day is not running after being opened"
SIZE=$(adb shell wm size | grep -oE '[0-9]+x[0-9]+' | tail -1)
W=${SIZE%x*}; H=${SIZE#*x}
for i in 2 3; do
  adb shell input swipe $((W / 2)) $((H * 8 / 10)) $((W / 2)) $((H * 2 / 10)) 400
  sleep 2
  shot "$i-scrolled"
done
next_step

# ---- 2. the widget, and the calendar changing under it ----
adb root > /dev/null 2>&1; sleep 3; adb wait-for-device
adb shell appwidget grantbind --package "$PKG" --user 0
adb shell am start -W -n "$PKG/.WidgetHostActivity"
wait_for "widget rows rebuilt: events_today=0" 40 || fail "The widget did not draw its list"
shot 4-widget

adb shell "content insert --uri 'content://com.android.calendar/calendars?caller_is_syncadapter=true&account_name=ci&account_type=LOCAL' \
  --bind account_name:s:ci --bind account_type:s:LOCAL --bind name:s:ci --bind calendar_displayName:s:CI \
  --bind calendar_color:i:-12417548 --bind calendar_access_level:i:700 --bind ownerAccount:s:ci \
  --bind visible:i:1 --bind sync_events:i:1"
CAL=$(adb shell "content query --uri content://com.android.calendar/calendars --projection _id" | grep -oE '_id=[0-9]+' | tail -1 | cut -d= -f2)
echo "test calendar: ${CAL:-none}"
[ -n "${CAL:-}" ] || fail "Could not create a calendar on the emulator"

next_step
add_event CI-meeting
wait_for "calendar changed" 40 || fail "The app did not hear that an event was added"
wait_for "events_today=1" 40 || fail "The widget did not show an event added to the calendar"
sleep 2
shot 5-widget-with-event

next_step
adb shell "content delete --uri content://com.android.calendar/events --where \"title='CI-meeting'\""
wait_for "events_today=0" 40 || fail "The widget kept showing an event deleted from the calendar"
sleep 2
shot 6-widget-after-delete

# ---- 3. the same with the app in the background and its process gone ----
adb shell input keyevent KEYCODE_HOME
sleep 3
adb shell am kill "$PKG"
sleep 2
next_step
add_event CI-background
wait_for "calendar changed" 60 || fail "With the app closed, it did not hear that an event was added"
next_step

# ---- crashes and errors anywhere above ----
if grep -E "FATAL EXCEPTION" -A 12 "$OUT/logcat.txt" | grep -q "$PKG"; then
  fail "My Day crashed"
  grep -E "FATAL EXCEPTION" -A 25 "$OUT/logcat.txt" | head -60
fi
if grep -E " E MyDay *:" "$OUT/logcat.txt"; then
  fail "My Day logged an error (a widget style, the widget list or the calendar query failed)"
fi
grep -E " [IWE] MyDay *:" "$OUT/logcat.txt" | tail -40
[ "$FAIL" = 0 ] && echo "My Day opened, drew every widget style, and its widget followed the calendar"
exit "$FAIL"

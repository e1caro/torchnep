#!/bin/bash
# On-device check (CI emulator job, or a phone on adb): installs the app and its test, runs OnDeviceTest
# (the real LiteRT model on a rendered recording, PDF export, screenshots) and pulls the results into device-out/.
set -euo pipefail
cd "$(dirname "$0")/.."
gradle :app:installDebug :app:installDebugAndroidTest --no-daemon --console=plain
adb shell pm grant io.github.e1caro.scorebook android.permission.RECORD_AUDIO || true
adb shell am instrument -w -e class io.github.e1caro.scorebook.OnDeviceTest \
  io.github.e1caro.scorebook.test/androidx.test.runner.AndroidJUnitRunner | tee instrument.txt
mkdir -p device-out
adb pull /sdcard/Android/data/io.github.e1caro.scorebook/files/. device-out/ || true
adb logcat -d -t 400 > device-out/logcat.txt || true
ls -la device-out
cat device-out/report.txt || true
grep -q "^OK (" instrument.txt

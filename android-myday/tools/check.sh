#!/usr/bin/env bash
# The checks that need no phone: dates, styles, the Claude request and reply, and finding a newer release.
# Run after build.sh (it uses build/classes). The SDK's android.jar only has stubs of org.json, so the real
# library is fetched from Maven Central and its checksum verified.
set -euo pipefail
cd "$(dirname "$0")/.."
ANDROID_JAR=${ANDROID_JAR:?set ANDROID_JAR to an API 34 android.jar}
JSON_JAR=build/json-20240303.jar
JSON_SHA=3cf6cd6892e32e2b4c1c39e0f52f5248a2f5b37646fdfbb79a66b46b618414ed
unset JAVA_TOOL_OPTIONS _JAVA_OPTIONS
if [ ! -f "$JSON_JAR" ]; then
  curl -fsSL -o "$JSON_JAR" https://repo1.maven.org/maven2/org/json/json/20240303/json-20240303.jar
fi
echo "$JSON_SHA  $JSON_JAR" | sha256sum -c -
mkdir -p build/test
javac -nowarn -Xlint:-options -cp "build/classes:$JSON_JAR:$ANDROID_JAR" -d build/test test/app/myday/widget/Check.java
java -cp "build/test:build/classes:$JSON_JAR:$ANDROID_JAR" app.myday.widget.Check

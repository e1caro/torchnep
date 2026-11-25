#!/usr/bin/env bash
# Builds the My Day APK with the Android SDK's own tools: no Gradle, no libraries.
#
#   ANDROID_JAR   an API 34 android.jar (the SDK's platforms/android-34/android.jar)        required
#   BUILD_TOOLS   an SDK build-tools folder (aapt2, d8 or dx, zipalign, apksigner)          default: Debian's
#   VERSION_CODE  the N of "My Day 1.N"                                                     default: 1
#   KEYSTORE, KEY_ALIAS, KEY_PASS   the signing key. Without KEYSTORE a throwaway key is made in signing/:
#                 the APK installs, but only APKs signed with the same key can update it.
#   CORE_JAR      only when ANDROID_JAR has no java.* classes (Robolectric's android-all jar): a jar that does
set -euo pipefail
cd "$(dirname "$0")"
BT=${BUILD_TOOLS:-/usr/lib/android-sdk/build-tools/debian}
ANDROID_JAR=${ANDROID_JAR:?set ANDROID_JAR to an API 34 android.jar}
VERSION_CODE=${VERSION_CODE:-1}
VERSION_NAME=${VERSION_NAME:-1.$VERSION_CODE}
KEY_ALIAS=${KEY_ALIAS:-myday}
export KEY_PASS=${KEY_PASS:-android}
unset JAVA_TOOL_OPTIONS _JAVA_OPTIONS

rm -rf build && mkdir -p build/gen build/classes build/dex
"$BT/aapt2" compile --dir res -o build/res.zip
"$BT/aapt2" link -o build/unsigned.apk -I "$ANDROID_JAR" --manifest AndroidManifest.xml \
  --java build/gen --min-sdk-version 24 --target-sdk-version 34 \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" build/res.zip
javac -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 \
  -bootclasspath "$ANDROID_JAR${CORE_JAR:+:$CORE_JAR}" \
  -d build/classes $(find build/gen src -name '*.java')
if [ -x "$BT/d8" ]; then
  jar cf build/classes.jar -C build/classes .
  "$BT/d8" --release --min-api 24 --lib "$ANDROID_JAR" --output build/dex build/classes.jar
else
  # Debian packages the older dx, which is why the code has no lambdas
  "$BT/dx" --dex --min-sdk-version=24 --output=build/dex/classes.dex build/classes
fi
(cd build/dex && zip -q -j ../unsigned.apk classes.dex)
"$BT/zipalign" -f -p 4 build/unsigned.apk build/aligned.apk
if [ -z "${KEYSTORE:-}" ]; then
  KEYSTORE=signing/myday.jks
  if [ ! -f "$KEYSTORE" ]; then
    mkdir -p signing
    keytool -genkeypair -keystore "$KEYSTORE" -storepass "$KEY_PASS" -keypass "$KEY_PASS" -alias "$KEY_ALIAS" \
      -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=My Day" 2>/dev/null
  fi
fi
"$BT/apksigner" sign --ks "$KEYSTORE" --ks-key-alias "$KEY_ALIAS" --ks-pass env:KEY_PASS --key-pass env:KEY_PASS \
  --min-sdk-version 24 --out build/MyDay.apk build/aligned.apk
"$BT/apksigner" verify --min-sdk-version 24 build/MyDay.apk
echo "built build/MyDay.apk (version $VERSION_NAME)"
